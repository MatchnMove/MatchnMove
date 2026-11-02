import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

test("revisit UI shows history and Auckland dates and prepares a preview without sending", async t => {
  const dom = new JSDOM("<div id='root'></div>", { url: "https://www.matchnmove.co.nz/admin/recruitment/tasks" });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({ window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const React = await import("react"), { createRoot } = await import("react-dom/client");
  const { AppRouterContext } = await import("next/dist/shared/lib/app-router-context.shared-runtime");
  const { MoverOutreachCampaigns } = await import("../components/recruitment-workspace");
  const root = createRoot(dom.window.document.getElementById("root")!);
  const originalFetch = globalThis.fetch;
  const calls: Array<{ action: string; data: Record<string, unknown> }> = [], navigated: string[] = [];
  const campaign = { id: "campaign", status: "REVIEW_DUE", reason: null, updatedAt: "2026-11-02T23:00:00.000Z", initialSentAt: "2026-08-02T23:00:00.000Z", lastSentAt: "2026-09-29T23:00:00.000Z", nextDueAt: null, revisitAt: "2026-11-02T22:00:00.000Z", nextSequence: 4,
    prospect: { id: "company", companyName: "Example Movers", contactName: "Alex", email: "alex@example.invalid", respondedAt: null, registeredAt: null, status: "CONTACTED" },
    messages: [{ id: "initial", templateKey: "MOVER_GENERAL", templateVersion: "2026-11-03.v1", sequence: 0, status: "SENT", sentAt: "2026-08-02T23:00:00.000Z", scheduledAt: null, lastError: null, quoteRequestId: null }] };
  globalThis.fetch = (async (_url, init) => {
    if (init?.method === "POST") { const body = JSON.parse(String(init.body)); calls.push(body); return Response.json({ id: "reengagement-draft" }); }
    return Response.json({ items: [campaign], health: { enabled: false, blocked: "Reply status is unknown." } });
  }) as typeof fetch;
  const router = { bfcacheId: "outreach-test", back() {}, forward() {}, refresh() {}, hmrRefresh() {}, replace() {}, push(url: string) { navigated.push(url); }, prefetch: async () => {} };
  t.after(async () => { await React.act(async () => root.unmount()); globalThis.fetch = originalFetch; for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); } dom.window.close(); });
  await React.act(async () => root.render(React.createElement(AppRouterContext.Provider, { value: router }, React.createElement(MoverOutreachCampaigns, { actor: { id: "admin", name: "Admin", role: "OWNER", canSend: true, canViewLeads: true } }))));
  assert.match(dom.window.document.body.textContent!, /Example Movers/);
  assert.match(dom.window.document.body.textContent!, /No response recorded does not establish that an email was ignored/);
  assert.match(dom.window.document.body.textContent!, /2026-11-03.v1/);
  assert.match(dom.window.document.body.textContent!, /3 Nov 2026/);
  const button = [...dom.window.document.querySelectorAll("button")].find(button => button.textContent === "Preview re-engagement")!;
  assert.ok(button);
  await React.act(async () => button.click());
  assert.equal(calls.length, 1); assert.equal(calls[0].action, "campaign"); assert.equal(calls[0].data.operation, "reengage");
  assert.deepEqual(navigated, ["/admin/recruitment/messages?id=reengagement-draft"]);
  assert.equal(calls.some(call => call.action === "send"), false);
});
