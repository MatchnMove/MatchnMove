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
    const response = await get("/app");
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes("Choose your company type"));
    assert.ok(html.includes("Moving company") && html.includes("Cleaning company"));
    assert.equal(html.includes("Build your"), false);
    assert.equal(html.includes("Partner account type"), false);
    assert.equal(html.includes("Create your mover account"), false);
    assert.equal(html.includes("Main navigation"), false);
    const linkedManifest = html.match(/<link[^>]*rel="manifest"[^>]*href="([^"]+)"/)?.[1];
    assert.ok(linkedManifest);
    const installedManifest = await (await get(linkedManifest)).json();
    assert.equal(installedManifest.start_url, "/app");
    assert.match(response.headers.get("cache-control") || "", /no-store/);
    const guide = await get("/install");
    assert.equal(guide.status, 200);
    assert.ok((await guide.text()).includes("iPhone / iPad"));
    const manifest = await (await get("/mover/manifest.webmanifest")).json();
    assert.equal(manifest.start_url, "/app");
    assert.equal((await get("/mover-sw.js")).status, 200);
  });
  await t.test("a protected dashboard returns to the mover login and preserves a lead deep link", async () => {
    const response = await get("/mover/dashboard?tab=leads&lead=fixture");
    assert.equal(response.status, 307);
    const location = new URL(response.headers.get("location")!, base);
    assert.equal(location.pathname, "/app");
    assert.equal(location.searchParams.get("next"), "/mover/dashboard?tab=leads&lead=fixture");
    assert.equal((await get("/api/mover/leads")).status, 401);
  });
  await t.test("website, cleaner and app entry points show both company choices before credentials", async () => {
    for (const [path, title] of [["/login", "Company login"], ["/signup", "Company sign-up"], ["/mover/login", "Company login"], ["/mover/login?mode=signup", "Company sign-up"], ["/cleaner/login", "Company login"], ["/cleaner/register", "Company sign-up"], ["/app?mode=signup", "Company sign-up"]]) {
      const response = await get(path);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes(title), `${path} must use its requested mode on first render`);
      assert.ok(html.includes("Moving company") && html.includes("Cleaning company"));
      assert.ok(html.includes("Choose your company type"));
      assert.doesNotMatch(html, /<input[^>]*name="email"/);
      assert.doesNotMatch(html, /<input[^>]*name="(?:password|companyName)"/);
      assert.equal(html.includes("Main navigation"), false);
    }
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
    const app = await get("/app?next=%2Fmover%2Fdashboard%3Ftab%3Dleads", cookie);
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
    assert.equal((await get("/api/mover/leads", cookie)).status, 200);
    assert.equal((await get("/api/cleaner/leads", cookie)).status, 401);
  });
  await t.test("cleaners use their own login, dashboard and lead API through the same installed app entry", async () => {
    const cleanerEmail = `cleaner-app-${randomUUID()}@validation.invalid`;
    await prisma.user.create({ data: { email: cleanerEmail, name: "Cleaner fixture", role: "CLEANER", emailVerifiedAt: new Date(), passwordHash: await hashPassword(password), cleanerCompany: { create: { companyName: "Local cleaning fixture", contactPerson: "Cleaner fixture", phone: "0210000000", status: "ACTIVE", serviceAreas: ["Manawatu-Whanganui"] } } } });
    const login = await post("/api/cleaner/login", { email: cleanerEmail, password });
    assert.equal(login.status, 200);
    assert.equal((await login.json()).emailCodeRequired, true);
    const code = mail.at(-1)!.replace(/=\r?\n/g, "").match(/\r?\n(\d{6})\r?\n/)?.[1];
    assert.ok(code);
    const verified = await post("/api/cleaner/login/verify-code", { email: cleanerEmail, code });
    assert.equal(verified.status, 200);
    const cleanerCookie = verified.headers.getSetCookie().find(value => value.startsWith("mm_session="))!.split(";")[0];
    const app = await get("/app?next=%2Fmover%2Fdashboard", cleanerCookie);
    if (app.status === 307) assert.equal(new URL(app.headers.get("location")!, base).pathname, "/cleaner/dashboard");
    else assert.ok((await app.text()).includes("url=/cleaner/dashboard") || app.headers.get("location")?.includes("/cleaner/dashboard"));
    const dashboard = await get("/cleaner/dashboard", cleanerCookie);
    assert.equal(dashboard.status, 200);
    assert.ok((await dashboard.text()).includes("Local cleaning fixture"));
    assert.equal((await get("/api/cleaner/leads", cleanerCookie)).status, 200);
    assert.equal((await get("/api/mover/leads", cleanerCookie)).status, 404);
    const legacy = await get("/mover/app");
    assert.equal(legacy.status, 200);
    assert.ok((await legacy.text()).includes("Choose your company type"));
    const worker = await get("/partner-sw.js");
    assert.equal(worker.status, 200);
    assert.equal(worker.headers.get("service-worker-allowed"), "/");
  });
  await t.test("logout clears the mover session and app launch returns to mover login", async () => {
    const logout = await post("/api/mover/logout", {}, cookie);
    assert.equal(logout.status, 200);
    assert.ok(logout.headers.getSetCookie().some(value => value.startsWith("mm_session=;")));
    const app = await get("/app");
    assert.equal(app.status, 200);
    assert.ok((await app.text()).includes("Choose your company type"));
    assert.equal(mail.length, 2);
  });
});
