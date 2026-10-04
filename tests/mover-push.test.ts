import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createECDH, randomBytes } from "node:crypto";
import { getMoverPushPayload, isAllowedPushEndpoint, isSameOriginPushRequest, pushFailureAction, pushSubscriptionSchema } from "../lib/mover-push-policy";
import { applicationServerKey, getInstallPlatform } from "../lib/mover-app-client";

test("notification mutations validate the public HTTPS origin behind a reverse proxy", () => {
  assert.equal(isSameOriginPushRequest("https://www.matchnmove.co.nz", "www.matchnmove.co.nz", "https"), true);
  assert.equal(isSameOriginPushRequest("http://127.0.0.1:3000", "127.0.0.1:3000", "http"), true);
  for (const origin of [null, "null", "https://evil.test", "http://www.matchnmove.co.nz", "https://www.matchnmove.co.nz/path", "https://www.matchnmove.co.nz.evil.test"]) {
    assert.equal(isSameOriginPushRequest(origin, "www.matchnmove.co.nz", "https"), false);
  }
});

test("push subscription validation only permits real HTTPS push services and valid keys", () => {
  const ecdh = createECDH("prime256v1");
  const p256dh = ecdh.generateKeys().toString("base64url");
  const subscription = { endpoint: "https://web.push.apple.com/test-subscription", keys: { p256dh, auth: randomBytes(16).toString("base64url") } };
  assert.equal(pushSubscriptionSchema.safeParse(subscription).success, true);
  for (const endpoint of ["http://fcm.googleapis.com/test", "https://127.0.0.1/test", "https://example.com", "https://web.push.apple.com.evil.test/test", "https://user:pass@web.push.apple.com/test", "https://web.push.apple.com:8443/test"]) {
    assert.equal(isAllowedPushEndpoint(endpoint), false, endpoint);
  }
  for (const endpoint of ["https://fcm.googleapis.com/fcm/send/a", "https://updates.push.services.mozilla.com/wpush/v2/a", "https://web.push.apple.com/a", "https://wns2-par02p.notify.windows.com/a"]) {
    assert.equal(isAllowedPushEndpoint(endpoint), true, endpoint);
  }
  assert.equal(pushSubscriptionSchema.safeParse({ ...subscription, keys: { p256dh: "invalid", auth: "invalid" } }).success, false);
});

test("notification messages contain no customer details and link to the assigned lead", () => {
  const payload = getMoverPushPayload("LEAD", "lead/123");
  assert.equal(payload.url, "/mover/dashboard?tab=leads&lead=lead%2F123");
  assert.equal(payload.title, "New moving quote available");
  assert.deepEqual(Object.keys(payload).sort(), ["body", "tag", "title", "url"]);
  assert.match(getMoverPushPayload("TEST").body, /Phone alerts are working/);
});

test("expired endpoints are removed and transient provider failures can retry", () => {
  assert.equal(pushFailureAction(404), "remove");
  assert.equal(pushFailureAction(410), "remove");
  for (const code of [undefined, 408, 429, 500, 503]) assert.equal(pushFailureAction(code), "retry");
  for (const code of [400, 401, 403, 413]) assert.equal(pushFailureAction(code), "fail");
});

test("installation guidance recognises iPhone, desktop-mode iPad, Android and computers", () => {
  assert.equal(getInstallPlatform("iPhone Safari"), "ios");
  assert.equal(getInstallPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X)", 5), "ios");
  assert.equal(getInstallPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X)", 0), "desktop");
  assert.equal(getInstallPlatform("Android Chrome"), "android");
  assert.equal(getInstallPlatform("Windows Chrome"), "desktop");
  const bytes = randomBytes(65);
  assert.deepEqual(Buffer.from(applicationServerKey(bytes.toString("base64url"))), bytes);
});

test("service worker displays pushes and refuses external notification destinations", async () => {
  const handlers: Record<string, (event: unknown) => void> = {};
  const displayed: Array<{ title: string; options: { data: { url: string } } }> = [];
  const opened: string[] = [];
  const pending: Promise<unknown>[] = [];
  const context = {
    URL, Response,
    self: { location: { origin: "https://www.matchnmove.co.nz" }, addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; },
      registration: { showNotification: async (title: string, options: { data: { url: string } }) => { displayed.push({ title, options }); } },
      clients: { matchAll: async () => [], openWindow: async (url: string) => { opened.push(url); } },
    },
  };
  vm.runInNewContext(readFileSync("public/mover-sw.js", "utf8"), context);
  for (const url of ["https://evil.test/phish", "/api/mover/account", "http://[invalid", "/mover/dashboard?tab=leads&lead=abc"]) {
    handlers.push({ data: { json: () => ({ title: "Quote", url }) }, waitUntil: (promise: Promise<unknown>) => pending.push(promise) });
  }
  await Promise.all(pending);
  assert.equal(displayed.length, 4);
  assert.equal(displayed[0].options.data.url, "https://www.matchnmove.co.nz/mover/dashboard");
  assert.equal(displayed[2].options.data.url, "https://www.matchnmove.co.nz/mover/dashboard");
  assert.equal(displayed[3].options.data.url, "https://www.matchnmove.co.nz/mover/dashboard?tab=leads&lead=abc");
  handlers.notificationclick({ notification: { close() {}, data: displayed[3].options.data }, waitUntil: (promise: Promise<unknown>) => pending.push(promise) });
  await Promise.all(pending);
  assert.deepEqual(opened, ["https://www.matchnmove.co.nz/mover/dashboard?tab=leads&lead=abc"]);
});
