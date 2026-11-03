import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import type { EmailStationDetail, EmailStationList } from "../lib/email-station";
import { moverTemplateKeys, cleanerTemplateKeys } from "../lib/mover-outreach-templates";

test("Email station focuses on company progress, opens previews on demand and pauses the selected sequence", async t => {
  const dom = new JSDOM("<div id='root'></div>", { url: "https://www.matchnmove.co.nz/admin/recruitment/messages" });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({ window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const React = await import("react"), { createRoot } = await import("react-dom/client");
  const { AppRouterContext } = await import("next/dist/shared/lib/app-router-context.shared-runtime");
  const { EmailOutreachStation } = await import("../components/email-outreach-station");
  const root = createRoot(dom.window.document.getElementById("root")!);
  const stamp = "2026-11-02T20:00:00.000Z", next = "2026-11-09T20:00:00.000Z";
  const active: EmailStationList["items"][number] = { id: "moving", companyName: "North Shore Removals", contactName: "James Wilson", email: "james@example.invalid", businessType: "MOVING", companyStatus: "CONTACTED", respondedAt: null, registeredAt: null, campaignId: "campaign", campaignStatus: "ACTIVE", nextSequence: 1, initialSentAt: stamp, lastSentAt: stamp, nextDueAt: next, revisitAt: "2027-02-02T20:00:00.000Z", hasLegacy: false, hasDraft: false, needsReview: false, sentCount: 1, status: "IN_PROGRESS" };
  const cleaner: EmailStationList["items"][number] = { ...active, id: "cleaning", companyName: "Example Cleaners", contactName: "Sarah", businessType: "CLEANING", status: "RESPONSE_RECEIVED", respondedAt: stamp, campaignId: "cleaner-campaign", campaignStatus: "STOPPED" };
  const message = { id: "initial", campaignId: "campaign", subject: "Invitation", sequence: 0, status: "SENT", templateKey: "MOVER_GENERAL", templateVersion: "v2", sentAt: stamp, scheduledAt: null, retryAt: null, createdAt: stamp, updatedAt: stamp, lastError: null, canPreview: true, hasLead: false };
  function detail(company: typeof active): EmailStationDetail {
    return { company: { ...company }, campaign: { id: company.campaignId!, status: company.campaignStatus!, reason: null, updatedAt: stamp, initialSentAt: stamp, lastSentAt: stamp, nextSequence: 1, nextDueAt: company.nextDueAt, revisitAt: company.revisitAt, createdAt: stamp }, campaigns: [], messages: [{ ...message, campaignId: company.campaignId, templateKey: company.businessType === "CLEANING" ? "CLEANER_GENERAL" : "MOVER_GENERAL" }], messageCount: 1, permissionRecorded: true, manualFollowUpAt: null, automation: { enabled: true, blocked: null }, templates: (company.businessType === "CLEANING" ? cleanerTemplateKeys : moverTemplateKeys).map((key, index) => ({ key, name: `Template ${index + 1}`, subject: "Company invitation", sequence: index < 2 ? 0 : index - 1 })) };
  }
  const originalFetch = globalThis.fetch;
  const calls: Array<{ action: string; data: Record<string, unknown> }> = [], reads: string[] = [], navigated: string[] = [];
  let deferred = false, finish!: () => void;
  globalThis.fetch = (async (url, init) => {
    if (init?.method === "POST") {
      const call = JSON.parse(String(init.body)); calls.push(call);
      assert.equal(call.action, "campaign");
      assert.equal(call.data.campaignId, "campaign");
      active.status = call.data.operation === "pause" ? "PAUSED" : "IN_PROGRESS";
      active.campaignStatus = call.data.operation === "pause" ? "PAUSED" : "ACTIVE";
      return Response.json({ ok: true });
    }
    const query = new URL(String(url), dom.window.location.origin).searchParams;
    reads.push(query.get("view")!);
    if (query.get("view") === "email_outreach") {
      const items = [active, cleaner].filter(company => !query.get("status") || company.status === query.get("status"));
      return Response.json({ items, count: items.length, page: 1, pageSize: 25, metrics: { companies: 2, inProgress: active.status === "IN_PROGRESS" ? 1 : 0, responses: 1, revisitDue: 0 } });
    }
    if (query.get("view") === "email_template_preview") return Response.json({ subject: "Preview only", html: "<p>Template example</p>" });
    if (query.get("id") === active.id && deferred) await new Promise<void>(resolve => { finish = resolve; });
    return Response.json(detail(query.get("id") === cleaner.id ? cleaner : active));
  }) as typeof fetch;
  const router = { bfcacheId: "email-station", back() {}, forward() {}, refresh() {}, hmrRefresh() {}, replace() {}, push(url: string) { navigated.push(url); }, prefetch: async () => {} };
  t.after(async () => { await React.act(async () => root.unmount()); globalThis.fetch = originalFetch; for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); } dom.window.close(); });
  await React.act(async () => root.render(React.createElement(AppRouterContext.Provider, { value: router }, React.createElement(EmailOutreachStation, { actor: { role: "OWNER", canViewLeads: true }, onCompose() {} }))));
  const buttons = () => [...dom.window.document.querySelectorAll("button")];
  const click = async (title: string) => React.act(async () => { const button = buttons().find(item => item.textContent?.trim() === title)!; assert.ok(button, title); button.click(); });
  const details = () => dom.window.document.querySelector('[aria-label="Company outreach details"]')!;
  assert.ok(dom.window.document.querySelector('[aria-label="Company email timeline"]'));
  assert.match(details().textContent!, /10 Nov 2026/);
  assert.match(details().textContent!, /Sent 3 Nov 2026/);
  assert.equal(dom.window.document.querySelectorAll("iframe").length, 0);
  assert.doesNotMatch(dom.window.document.body.textContent!, /Prefilled introduction template|I hope you're doing well/);
  assert.equal(calls.length, 0);
  await click("Send history");
  assert.ok(details().querySelector('a[href="/admin/recruitment/messages?id=initial"]'));
  assert.match(details().textContent!, /Sent 3 Nov 2026/);
  await click("Templates");
  await click("Preview template");
  assert.ok(details().querySelector('iframe[title="Email template preview"]'));
  assert.equal(calls.length, 0);
  assert.equal(reads.includes("messages"), false, "Email bodies are loaded only after a saved-email preview is opened");
  await click("Timeline");
  await click("Pause outreach");
  assert.equal(calls[0].data.operation, "pause");
  assert.match(details().textContent!, /Next follow-upPaused/);
  await click("Resume outreach");
  assert.equal(calls[1].data.operation, "resume");
  const choose = async (name: string) => React.act(async () => { const button = [...dom.window.document.querySelectorAll<HTMLButtonElement>('[aria-label="Company outreach records"] button')].find(item => item.textContent?.includes(name))!; assert.ok(button); button.click(); });
  await choose("Example Cleaners");
  assert.match(details().textContent!, /Cleaning company/);
  assert.match(details().textContent!, /Next follow-upPaused/);
  assert.equal([...details().querySelectorAll("button")].some(item => item.textContent?.includes("Resume outreach")), false);
  deferred = true;
  await choose("North Shore Removals");
  assert.ok(finish);
  await choose("Example Cleaners");
  await React.act(async () => finish());
  assert.match(details().textContent!, /Example Cleaners/);
  assert.doesNotMatch(details().textContent!, /North Shore Removals/);
  assert.equal(calls.some(call => call.action === "send"), false);
  assert.deepEqual(navigated, []);
});
