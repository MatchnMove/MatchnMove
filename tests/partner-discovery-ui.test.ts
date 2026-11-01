import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { discoveryPrefill } from "../lib/mover-discovery";
import { parseWebCandidate } from "../lib/mover-web-discovery";

test("partner search switches between moving and cleaning and preserves the searched type for pages and review", async t => {
  const dom = new JSDOM("<div id='root'></div>", { url: "https://www.matchnmove.co.nz/admin/recruitment/prospects" });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({ window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { MoverDiscovery } = await import("../components/mover-discovery");
  const root = createRoot(dom.window.document.getElementById("root")!);
  const originalFetch = globalThis.fetch;
  const requests: Array<Record<string, unknown>> = [];
  const chosen: Array<{ businessType: string }> = [];
  const candidate = parseWebCandidate({ place_id: "ChIJ_cleaning_fixture", title: "Example Cleaning", type: "Cleaning service" })!;
  const item = { ...candidate, match: { duplicate: false, registered: false, suppressed: false, existingId: null } };
  globalThis.fetch = (async (_url, init) => {
    const request = JSON.parse(String(init?.body));
    requests.push(request);
    return Response.json(request.action === "maps_details"
      ? { item, prefill: discoveryPrefill(candidate, request.businessType) }
      : { items: [item], page: request.page, hasMore: true });
  }) as typeof fetch;
  t.after(async () => {
    await React.act(async () => root.unmount());
    globalThis.fetch = originalFetch;
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    dom.window.close();
  });
  const click = (name: string) => React.act(async () => {
    const button = [...dom.window.document.querySelectorAll("button")].find(button => button.textContent?.trim() === name);
    assert.ok(button, `Button ${name} exists`);
    button.click();
  });
  const submit = () => React.act(async () => {
    dom.window.document.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
  });
  await React.act(async () => root.render(React.createElement(MoverDiscovery, { onChoose: form => chosen.push(form) })));
  await click("Find partners online");
  await submit();
  assert.equal(requests[0].businessType, "MOVING");
  assert.equal(requests[0].query, "movers");
  await React.act(async () => {
    const select = dom.window.document.querySelector<HTMLSelectElement>("#discovery-business-type")!;
    select.value = "CLEANING";
    select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  });
  assert.equal(dom.window.document.querySelector<HTMLInputElement>("#discovery-query")!.value, "cleaners");
  assert.doesNotMatch(dom.window.document.body.textContent!, /Example Cleaning/);
  await submit();
  await click("Next page");
  assert.equal(requests[1].businessType, "CLEANING");
  assert.equal(requests[1].query, "cleaners");
  assert.equal(requests[2].businessType, "CLEANING");
  assert.equal(requests[2].page, 2);
  await click("Review & add");
  assert.equal(requests[3].businessType, "CLEANING");
  assert.equal(chosen[0].businessType, "CLEANING");
});
