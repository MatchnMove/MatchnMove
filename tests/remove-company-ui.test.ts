import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

test("company removal requires confirmation, sends the record version and preserves the UI on errors", async t => {
  const dom = new JSDOM("<div id='root'></div>", { url: "https://www.matchnmove.co.nz/admin/recruitment/prospects" });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({ window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const React = await import("react"), { createRoot } = await import("react-dom/client");
  const { RemoveCompanyButton } = await import("../components/remove-company-button");
  const root = createRoot(dom.window.document.getElementById("root")!);
  const originalFetch = globalThis.fetch;
  const calls: unknown[] = [];
  let confirmed = false, reloads = 0, fail = false;
  dom.window.confirm = () => confirmed;
  globalThis.fetch = (async (_url, init) => { calls.push(JSON.parse(String(init?.body))); return fail ? Response.json({ error: "Record changed. Reload." }, { status: 409 }) : Response.json({ ok: true }); }) as typeof fetch;
  t.after(async () => { await React.act(async () => root.unmount()); globalThis.fetch = originalFetch; for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); } dom.window.close(); });
  await React.act(async () => root.render(React.createElement(RemoveCompanyButton, { company: { id: "company", companyName: "Example Cleaners", version: 3 }, onRemoved: () => { reloads++; } })));
  await React.act(async () => dom.window.document.querySelector("button")!.click());
  assert.equal(calls.length, 0);
  confirmed = true; fail = true;
  await React.act(async () => dom.window.document.querySelector("button")!.click());
  assert.match(dom.window.document.querySelector('[role="alert"]')!.textContent!, /Record changed/);
  assert.equal(reloads, 0);
  fail = false;
  await React.act(async () => dom.window.document.querySelector("button")!.click());
  assert.equal(reloads, 1);
  assert.deepEqual(calls.at(-1), { action: "remove_company", data: { id: "company", version: 3, confirmed: true } });
});
