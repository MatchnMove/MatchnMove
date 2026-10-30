import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM, VirtualConsole } from "jsdom";

test("real partner forms reveal one step, retain drafts and use the existing secure endpoints", async t => {
  const virtualConsole = new VirtualConsole();
  const dom = new JSDOM("<!doctype html><div id='root'></div>", { url: "https://www.matchnmove.co.nz/mover/login", virtualConsole });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({ window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement, Event: dom.window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { PartnerAuth } = await import("../components/partner-auth");
  const { LanguageProvider } = await import("../components/language-provider");
  const root = createRoot(dom.window.document.getElementById("root")!);
  const originalFetch = globalThis.fetch;
  const calls: Array<{ path: string; body: Record<string, unknown> }> = [];
  let handler: (path: string) => Response | Promise<Response> = () => Response.json({ error: "Fixture rejection" }, { status: 400 });
  globalThis.fetch = (async (input, init) => {
    const path = String(input);
    if (path.startsWith("/api/mover/login") || path.startsWith("/api/cleaner/login") || path.endsWith("/register")) {
      calls.push({ path, body: JSON.parse(String(init?.body)) });
      return handler(path);
    }
    return Response.json({ authenticated: false });
  }) as typeof fetch;
  t.after(async () => {
    await React.act(async () => root.unmount());
    globalThis.fetch = originalFetch;
    for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
    dom.window.close();
  });
  let renderId = 0;
  async function mount(business: "mover" | "cleaner", initialMode: "login" | "signup" = "login", appMode = false) {
    dom.window.history.replaceState(null, "", `/${business}/${appMode ? "app" : "login"}`);
    calls.length = 0;
    await React.act(async () => root.render(React.createElement(LanguageProvider, null, React.createElement(PartnerAuth, { key: ++renderId, business, initialMode, appMode }))));
  }
  function input(name: string) { const element = dom.window.document.querySelector<HTMLInputElement>(`input[name="${name}"]:not([hidden])`); assert.ok(element, `${name} must be on this step`); return element; }
  function button(text: string) { const element = [...dom.window.document.querySelectorAll("button")].find(item => item.textContent?.trim() === text || item.getAttribute("aria-label") === text); assert.ok(element, `${text} button must exist`); return element; }
  async function fill(name: string, value: string) {
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!.call(input(name), value);
      input(name).dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    });
  }
  async function click(text: string) { await React.act(async () => button(text).click()); }
  const title = () => dom.window.document.querySelector("h1")?.textContent;

  for (const business of ["mover", "cleaner"] as const) {
    await t.test(`${business} login validates email, handles credential errors, then verifies a code`, async () => {
      await mount(business);
      assert.equal(title(), "Welcome back");
      assert.equal(dom.window.document.querySelector("input[name=password]"), null);
      await fill("email", "invalid"); await click("Continue");
      assert.equal(title(), "Welcome back"); assert.equal(calls.length, 0);
      await fill("email", "Mover@validation.invalid"); await click("Continue");
      assert.equal(title(), "Enter your password"); assert.equal(calls.length, 0);
      await fill("password", "WrongPassword!1");
      handler = () => Response.json({ error: "Incorrect credentials" }, { status: 401 });
      await click("Sign in");
      assert.match(dom.window.document.querySelector('[role="alert"]')?.textContent || "", /Incorrect credentials/);
      assert.equal(title(), "Enter your password");
      handler = () => Response.json({ emailCodeRequired: true, email: "mover@validation.invalid" });
      await fill("password", "CorrectPassword!1"); await click("Sign in");
      assert.equal(title(), "Check your email");
      assert.equal(calls.at(-1)?.path, `/api/${business}/login`);
      assert.equal(calls.at(-1)?.body.email, "mover@validation.invalid");
      await fill("code", "12a3456"); assert.equal(input("code").value, "123456");
      handler = () => Response.json({ error: "Expired code" }, { status: 400 });
      await click("Verify & sign in");
      assert.equal(calls.at(-1)?.path, `/api/${business}/login/verify-code`);
      assert.equal(calls.at(-1)?.body.code, "123456");
      assert.equal(title(), "Check your email");
      handler = () => Response.json({ emailCodeRequired: true });
      await click("Send a new code"); assert.equal(input("code").value, "");
      await click("Back"); assert.equal(input("password").value, "CorrectPassword!1");
      await click("Back"); assert.equal(input("email").value, "mover@validation.invalid");
    });
    await t.test(`${business} signup preserves details, checks passwords and requires final consent`, async () => {
      await mount(business, "signup");
      assert.equal(title(), "Create your account");
      assert.equal(dom.window.document.querySelector("input[name=companyName]"), null);
      await fill("email", "new@validation.invalid"); await click("Continue");
      assert.equal(title(), "About your business");
      await fill("name", "Fixture Owner"); await fill("companyName", "Fixture Company"); await fill("phone", "0211234567");
      await click("Continue"); assert.equal(title(), "Secure your account"); assert.equal(calls.length, 0);
      await click("Back"); assert.equal(input("companyName").value, "Fixture Company");
      await click("Continue");
      await fill("password", "StrongPassword!1"); await fill("confirmPassword", "DifferentPassword!1");
      await click("Create account"); assert.equal(calls.length, 0);
      await React.act(async () => input("acceptedTerms").click());
      await click("Create account"); assert.equal(calls.length, 0);
      assert.match(dom.window.document.querySelector('[role="alert"]')?.textContent || "", /Passwords do not match/);
      if (business === "cleaner") assert.match(dom.window.document.body.textContent || "", /\$15/);
      await fill("confirmPassword", "StrongPassword!1");
      handler = () => Response.json({ error: "Account already exists" }, { status: 409 });
      await click("Create account");
      assert.equal(calls.at(-1)?.path, `/api/${business}/register`);
      assert.deepEqual(calls.at(-1)?.body, { email: "new@validation.invalid", name: "Fixture Owner", companyName: "Fixture Company", phone: "0211234567", password: "StrongPassword!1", confirmPassword: "StrongPassword!1", acceptedTerms: true });
      assert.equal(title(), "Secure your account");
      assert.equal(input("password").value, "StrongPassword!1");
    });
  }
  await t.test("app login has a quiet install link and company selection is a separate website step", async () => {
    await mount("mover", "login", true);
    assert.equal(dom.window.document.querySelector('a[href="/mover/install"]')?.textContent, "Install & help");
    assert.equal(dom.window.document.querySelector('input[name="password"]'), null);
    assert.equal([...dom.window.document.querySelectorAll("button")].some(item => item.textContent === "Change business type"), false);
    await click("Create account"); assert.equal(title(), "Create your account");
    await mount("mover"); await click("Change business type");
    assert.equal(title(), "Choose your business");
    assert.equal(dom.window.document.querySelector('a[href="/cleaner/login"]')?.textContent, "Cleaning company");
    assert.equal(dom.window.document.querySelector("form"), null);
  });
  await t.test("a pending request disables the form and cannot send duplicate sign-in emails", async () => {
    await mount("mover"); await fill("email", "test@validation.invalid"); await click("Continue"); await fill("password", "StrongPassword!1");
    let resolve!: (response: Response) => void;
    handler = () => new Promise<Response>(done => { resolve = done; });
    await click("Sign in");
    assert.equal(input("password").closest("fieldset")?.disabled, true);
    await React.act(async () => dom.window.document.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
    assert.equal(calls.length, 1);
    await React.act(async () => resolve(Response.json({ emailCodeRequired: true })));
    assert.equal(title(), "Check your email");
  });
});
