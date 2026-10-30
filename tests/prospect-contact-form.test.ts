import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

test("company editor requires independent availability choices and accepts absent nonpublic details", async t => {
  const dom = new JSDOM("<div id='root'></div>", { url: "http://localhost/admin/recruitment/prospects" });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({ window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement, Event: dom.window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { ProspectEditor } = await import("../components/recruitment-workspace");
  const root = createRoot(dom.window.document.getElementById("root")!);
  const saved: Array<{ emailAvailability: string; phoneAvailability: string; email: string }> = [];
  t.after(async () => {
    await React.act(async () => root.unmount());
    for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
    dom.window.close();
  });
  await React.act(async () => root.render(React.createElement(ProspectEditor, { initialValues: { companyName: "Company without public contacts" }, onSave: async form => { saved.push(form); } })));
  const input = (selector: string) => dom.window.document.querySelector<HTMLInputElement>(selector)!;
  const submit = () => React.act(async () => { dom.window.document.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })); });
  const choose = (field: string, value: string) => React.act(async () => input(`input[name=${field}Availability][value=${value}]`).click());
  await submit();
  assert.equal(saved.length, 0);
  assert.match(dom.window.document.body.textContent!, /Select an availability status for both/);
  await choose("email", "NOT_PUBLIC"); await submit();
  assert.equal(saved.length, 0);
  await choose("phone", "PUBLIC"); await submit();
  assert.equal(saved.length, 0);
  assert.match(dom.window.document.body.textContent!, /Phone number is required/);
  await choose("phone", "NOT_PUBLIC"); await submit();
  assert.equal(saved.length, 1);
  assert.equal(saved[0].email, "");
  assert.equal(saved[0].emailAvailability, "NOT_PUBLIC");
  assert.equal(saved[0].phoneAvailability, "NOT_PUBLIC");
  await choose("email", "PUBLIC");
  assert.equal(input('input[name=emailAvailability][value=NOT_PUBLIC]').checked, false);
  assert.equal(input('input[name=phoneAvailability][value=NOT_PUBLIC]').checked, true);
  await submit();
  assert.equal(saved.length, 1);
  assert.match(dom.window.document.body.textContent!, /Business email is required/);
});
