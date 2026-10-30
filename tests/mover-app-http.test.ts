import assert from "node:assert/strict";
import test from "node:test";
import { createServer, type Socket } from "node:net";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/db";
import { hashPassword } from "../lib/password";

const base = process.env.MOVER_APP_TEST_BASE_URL;
test("mover app public installation, existing-account login, email code and logout", { skip: !base, timeout: 120000 }, async t => {
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(base!).hostname));
  const database = new URL(process.env.MOVER_APP_TEST_DATABASE_URL || "http://invalid");
  assert.equal(database.hostname, "127.0.0.1");
  assert.ok(database.pathname.endsWith("_test"));
  assert.equal(process.env.DATABASE_URL, process.env.MOVER_APP_TEST_DATABASE_URL);
  const mail: string[] = [];
  const sockets = new Set<Socket>();
  const smtp = createServer(socket => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.write("220 localhost fixture mail catcher\r\n");
    let buffer = "";
    let data = false;
    socket.on("data", chunk => {
      buffer += chunk.toString();
      while (buffer.includes("\r\n")) {
        if (data) {
          const end = buffer.indexOf("\r\n.\r\n");
          if (end < 0) return;
          mail.push(buffer.slice(0, end)); buffer = buffer.slice(end + 5); data = false;
          socket.write("250 accepted locally\r\n"); continue;
        }
        const end = buffer.indexOf("\r\n");
        const command = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        if (command.startsWith("EHLO")) socket.write("250-localhost\r\n250 AUTH PLAIN\r\n");
        else if (command.startsWith("AUTH")) socket.write("235 authenticated\r\n");
        else if (command.startsWith("RCPT") && !command.includes("@validation.invalid>")) socket.write("550 fixture recipients only\r\n");
        else if (command === "DATA") { data = true; socket.write("354 end with dot\r\n"); }
        else if (command === "QUIT") socket.end("221 bye\r\n");
        else socket.write("250 ok\r\n");
      }
    });
  });
  await new Promise<void>(resolve => smtp.listen(3112, "127.0.0.1", resolve));
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise<void>(resolve => smtp.close(() => resolve())); await prisma.$disconnect(); });
  const email = `mover-app-${randomUUID()}@validation.invalid`;
  const password = "LocalMover!12345";
  await prisma.user.create({ data: { email, name: "Mover app fixture", role: "MOVER", emailVerifiedAt: new Date(), passwordHash: await hashPassword(password), moverCompany: { create: { companyName: "Local transport fixture", status: "ACTIVE", serviceAreas: ["Manawatu-Whanganui"], phone: "0210000000" } } } });
  const get = (path: string, cookie?: string) => fetch(base + path, { redirect: "manual", headers: cookie ? { Cookie: cookie } : {} });
  const post = (path: string, body: unknown, cookie?: string) => fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json", Origin: base!, ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
  await t.test("installation and dedicated login are available before authentication", async () => {
    const response = await get("/mover/app");
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes("Welcome back"));
    assert.ok(html.includes("Mover app"));
    assert.equal(html.includes("Build your"), false);
    assert.equal(html.includes("Partner account type"), false);
    assert.equal(html.includes("Create your mover account"), false);
    assert.equal(html.includes("Main navigation"), false);
    const linkedManifest = html.match(/<link[^>]*rel="manifest"[^>]*href="([^"]+)"/)?.[1];
    assert.ok(linkedManifest);
    const installedManifest = await (await get(linkedManifest)).json();
    assert.equal(installedManifest.start_url, "/mover/app");
    assert.match(response.headers.get("cache-control") || "", /no-store/);
    const guide = await get("/mover/install");
    assert.equal(guide.status, 200);
    assert.ok((await guide.text()).includes("iPhone / iPad"));
    const manifest = await (await get("/mover/manifest.webmanifest")).json();
    assert.equal(manifest.start_url, "/mover/app");
    assert.equal((await get("/mover-sw.js")).status, 200);
  });
  await t.test("a protected dashboard returns to the mover login and preserves a lead deep link", async () => {
    const response = await get("/mover/dashboard?tab=leads&lead=fixture");
    assert.equal(response.status, 307);
    const location = new URL(response.headers.get("location")!, base);
    assert.equal(location.pathname, "/mover/app");
    assert.equal(location.searchParams.get("next"), "/mover/dashboard?tab=leads&lead=fixture");
    assert.equal((await get("/api/mover/leads")).status, 401);
  });
  let cookie = "";
  await t.test("existing credentials send a code only to the local mail catcher and verification establishes the session", async () => {
    const login = await post("/api/mover/login", { email, password });
    assert.equal(login.status, 200, await login.clone().text());
    assert.equal((await login.json()).emailCodeRequired, true);
    assert.equal(mail.length, 1);
    const code = mail[0].replace(/=\r?\n/g, "").match(/\r?\n(\d{6})\r?\n/)?.[1];
    assert.ok(code, "Local sign-in email must include a six-digit code");
    const verify = await post("/api/mover/login/verify-code", { email, code });
    assert.equal(verify.status, 200, await verify.clone().text());
    const header = verify.headers.getSetCookie().find(value => value.startsWith("mm_session="));
    assert.ok(header);
    assert.match(header, /HttpOnly/i);
    cookie = header.split(";")[0];
    const app = await get("/mover/app?next=%2Fmover%2Fdashboard%3Ftab%3Dleads", cookie);
    if (app.status === 307) assert.equal(new URL(app.headers.get("location")!, base).pathname, "/mover/dashboard");
    else {
      assert.equal(app.status, 200);
      const redirected = await app.text();
      // Next.js can deliver a redirect as a refresh marker after streaming starts.
      assert.ok(redirected.includes("url=/mover/dashboard?tab=leads") || redirected.includes("NEXT_REDIRECT;replace;/mover/dashboard?tab=leads;"));
    }
    const dashboard = await get("/mover/dashboard", cookie);
    assert.equal(dashboard.status, 200);
    assert.ok((await dashboard.text()).includes("Local transport fixture"));
    const push = await get("/api/mover/push", cookie);
    assert.equal(push.status, 200);
    assert.ok(Array.isArray((await push.json()).subscriptions));
  });
  await t.test("logout clears the mover session and app launch returns to mover login", async () => {
    const logout = await post("/api/mover/logout", {}, cookie);
    assert.equal(logout.status, 200);
    assert.ok(logout.headers.getSetCookie().some(value => value.startsWith("mm_session=;")));
    const app = await get("/mover/app");
    assert.equal(app.status, 200);
    assert.ok((await app.text()).includes("Welcome back"));
    assert.equal(mail.length, 1);
  });
});
