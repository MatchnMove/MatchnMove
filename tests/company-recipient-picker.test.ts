import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

test("company search displays selectable matches, ignores stale responses and explains empty/error results", async t => {
  const dom = new JSDOM("<div id='root'></div>", { url: "https://www.matchnmove.co.nz/admin/recruitment/messages" });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({ window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { CompanyRecipientPicker } = await import("../components/company-recipient-picker");
  const root = createRoot(dom.window.document.getElementById("root")!);
  const originalFetch = globalThis.fetch;
  const company = { id: "canterbury", companyName: "Canterbury Movers", email: "info@example.invalid", contactName: "Contact", consentBasis: "UNKNOWN", consentEvidence: null };
  const calls: string[] = [];
  let resolveOld!: (response: Response) => void;
  globalThis.fetch = (async path => {
    const url = new URL(String(path), dom.window.location.origin);
    if (url.searchParams.get("view") === "prospect") return Response.json({ ...company, id: "outside-first-page" });
    const q = url.searchParams.get("q") || "";
    calls.push(q);
    if (q === "slow") return new Promise<Response>(resolve => { resolveOld = resolve; });
    if (q === "failure") return Response.json({ error: "Search temporarily unavailable" }, { status: 503 });
    return Response.json({ items: q === "nothing" ? [] : [company], count: q === "nothing" ? 0 : 1 });
  }) as typeof fetch;
  let selected: string | null = null;
  t.after(async () => {
    await React.act(async () => root.unmount());
    globalThis.fetch = originalFetch;
    for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
    dom.window.close();
  });
  await React.act(async () => root.render(React.createElement(CompanyRecipientPicker, { value: "", onChange: item => { selected = item?.id || null; } })));
  const settle = async () => React.act(async () => { await new Promise(resolve => setTimeout(resolve, 290)); });
  const input = () => dom.window.document.querySelector("input")!;
  const search = async (value: string) => {
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!.call(input(), value);
      input().dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    });
    await settle();
  };
  await settle();
  assert.match(dom.window.document.querySelector('[role="status"]')!.textContent!, /1 company found/);
  await search(" Canterbury ");
  assert.equal(calls.at(-1), "Canterbury");
  const match = dom.window.document.querySelector<HTMLButtonElement>('[aria-label="Matching companies"] button')!;
  assert.match(match.textContent!, /Canterbury Movers/);
  await React.act(async () => match.click());
  assert.equal(selected, "canterbury");
  await search("info@example.invalid");
  assert.equal(calls.at(-1), "info@example.invalid");
  assert.match(dom.window.document.querySelector('[aria-label="Matching companies"]')!.textContent!, /Canterbury Movers/);
  await search("slow");
  await search("nothing");
  assert.equal(selected, null);
  assert.match(dom.window.document.querySelector('[role="status"]')!.textContent!, /No saved companies match/);
  await React.act(async () => resolveOld(Response.json({ items: [company], count: 1 })));
  assert.equal(dom.window.document.querySelectorAll('[aria-label="Matching companies"] button').length, 0);
  await search("failure");
  assert.match(dom.window.document.querySelector('[role="alert"]')!.textContent!, /Search temporarily unavailable/);
  await React.act(async () => root.render(React.createElement(CompanyRecipientPicker, { key: "direct-company", initialId: "outside-first-page", value: "", onChange: item => { selected = item?.id || null; } })));
  assert.equal(selected, "outside-first-page", "Direct company links resolve independently of the first 50 search results");
});
