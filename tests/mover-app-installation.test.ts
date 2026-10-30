import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import manifest from "../app/manifest";
import { GET as moverManifest } from "../app/mover/manifest.webmanifest/route";
import { moverDashboardReturnPath } from "../lib/mover-app-navigation";
import { registerMoverAppWorker } from "../lib/mover-app-client";

test("both install manifests launch the mover experience and preserve the existing mover app identity", async () => {
  const publicManifest = manifest();
  const dedicatedManifest = await moverManifest().json();
  assert.deepEqual(dedicatedManifest, publicManifest);
  assert.equal(publicManifest.id, "/mover/dashboard");
  assert.equal(publicManifest.start_url, "/mover/app");
  assert.equal(publicManifest.scope, "/mover/");
  assert.equal(publicManifest.display, "standalone");
  for (const icon of publicManifest.icons || []) {
    const png = readFileSync(`public${icon.src}`);
    const [width, height] = icon.sizes!.split("x").map(Number);
    assert.equal(png.readUInt32BE(16), width);
    assert.equal(png.readUInt32BE(20), height);
  }
});

test("app return links keep a lead deep link but cannot redirect to marketing or another site", () => {
  assert.equal(moverDashboardReturnPath("/mover/dashboard?tab=leads&lead=abc"), "/mover/dashboard?tab=leads&lead=abc");
  for (const value of [null, "/", "/quote", "/admin", "//evil.invalid", "/\\evil.invalid", "https://evil.invalid", "/mover/dashboard/../../quote", "/mover/dashboard\n"]) assert.equal(moverDashboardReturnPath(value), "/mover/dashboard");
});

test("worker registration returns its own active registration without waiting indefinitely for a controller", async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const registration = { active: { state: "activated" } };
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { serviceWorker: {
    register: async (script: string, options: unknown) => {
      assert.equal(script, "/mover-sw.js");
      assert.deepEqual(options, { scope: "/mover/", updateViaCache: "none" });
      return registration;
    },
    get ready() { throw new Error("The global ready promise must not be used"); },
  } } });
  try { assert.equal(await registerMoverAppWorker(), registration); }
  finally { if (original) Object.defineProperty(globalThis, "navigator", original); else Reflect.deleteProperty(globalThis, "navigator"); }
});

test("a failed worker installation rejects with an actionable error", async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const worker = Object.assign(new EventTarget(), { state: "installing" });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { serviceWorker: { register: async () => ({ installing: worker }) } } });
  try {
    const result = registerMoverAppWorker();
    await Promise.resolve();
    worker.state = "redundant";
    worker.dispatchEvent(new Event("statechange"));
    await assert.rejects(result, /setup failed/);
  } finally { if (original) Object.defineProperty(globalThis, "navigator", original); else Reflect.deleteProperty(globalThis, "navigator"); }
});

test("the worker caches only the generic offline shell and never writes authenticated pages or API data", async () => {
  const handlers: Record<string, (event: unknown) => void> = {};
  const cacheWrites: string[][] = [];
  let failNetwork = false;
  const offline = new Response("generic offline help");
  const context = {
    URL, Response,
    fetch: async () => { if (failNetwork) throw new Error("offline"); return new Response("private dashboard"); },
    caches: { open: async () => ({ addAll: async (urls: string[]) => { cacheWrites.push(urls); } }), match: async () => offline },
    self: { location: { origin: "https://www.matchnmove.co.nz" }, skipWaiting() {}, addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; } },
  };
  vm.runInNewContext(readFileSync("public/mover-sw.js", "utf8"), context);
  let pending: Promise<unknown> | undefined;
  handlers.install({ waitUntil: (promise: Promise<unknown>) => { pending = promise; } });
  await pending;
  assert.equal(JSON.stringify(cacheWrites), JSON.stringify([["/mover-offline.html", "/mover-app/icon-192.png"]]));
  let response: Promise<Response> | undefined;
  handlers.fetch({ request: { mode: "navigate", url: "https://www.matchnmove.co.nz/mover/dashboard" }, respondWith: (promise: Promise<Response>) => { response = promise; } });
  assert.equal(await (await response!).text(), "private dashboard");
  failNetwork = true;
  handlers.fetch({ request: { mode: "navigate", url: "https://www.matchnmove.co.nz/mover/app" }, respondWith: (promise: Promise<Response>) => { response = promise; } });
  assert.equal(await response, offline);
  assert.equal(cacheWrites.length, 1);
  let intercepted = false;
  handlers.fetch({ request: { mode: "cors", url: "https://www.matchnmove.co.nz/api/mover/leads" }, respondWith: () => { intercepted = true; } });
  assert.equal(intercepted, false);
});
