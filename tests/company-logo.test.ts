import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

test("failed logos show a clean fallback and replacement uploads are attempted", async t => {
  const dom = new JSDOM("<div id='root'></div>", { url: "https://www.matchnmove.co.nz/movers" });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({ window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { CompanyLogo } = await import("../components/company-logo");
  const root = createRoot(dom.window.document.getElementById("root")!);
  t.after(async () => {
    await React.act(async () => root.unmount());
    for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
    dom.window.close();
  });
  const render = (src: string | null) => React.act(async () => root.render(React.createElement(CompanyLogo, { src, companyName: "Example Movers" })));
  await render("/logo?v=old");
  assert.equal(dom.window.document.querySelector("img")?.getAttribute("alt"), "Example Movers logo");
  await React.act(async () => dom.window.document.querySelector("img")!.dispatchEvent(new dom.window.Event("error")));
  assert.equal(dom.window.document.querySelector("img"), null);
  assert.ok(dom.window.document.querySelector('[aria-label="Example Movers logo unavailable"]'));
  await render("/logo?v=replacement");
  assert.equal(dom.window.document.querySelector("img")?.getAttribute("src"), "/logo?v=replacement");
  await render(null);
  assert.equal(dom.window.document.querySelector("img"), null);
});
