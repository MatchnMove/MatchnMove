import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { renderMoverOutreachEmail } from "../lib/mover-outreach-templates";

test("Lead Opportunities loads matches and opens the prepared previews for the selected request", async (t) => {
  const dom = new JSDOM("<div id='root'></div>", {
    url: "https://www.matchnmove.co.nz/admin/recruitment/leads",
  });
  const globals = {
    window: dom.window,
    self: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    Event: dom.window.Event,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  const previous = Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }

  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { AppRouterContext } = await import("next/dist/shared/lib/app-router-context.shared-runtime");
  const { SearchParamsContext } = await import("next/dist/shared/lib/hooks-client-context.shared-runtime");
  const { RecruitmentWorkspace } = await import("../components/recruitment-workspace");
  const root = createRoot(dom.window.document.getElementById("root")!);
  const originalFetch = globalThis.fetch;
  t.after(async () => {
    await React.act(async () => root.unmount());
    globalThis.fetch = originalFetch;
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    dom.window.close();
  });

  const first = { id: "first", origin: "Auckland", destination: "Northland", moveDate: "2026-11-18", bedrooms: "2", property: "house" };
  const second = { ...first, id: "second", origin: "Wellington", destination: "Manawatū-Whanganui" };
  const company = { id: "company", companyName: "North Shore Removals", email: "dispatch@example.invalid", status: "NEW", consentBasis: "EXPRESS", reasons: ["Services origin: Auckland"], requiresReview: false };
  const otherCompany = { ...company, id: "other-company", companyName: "Harbour Movers", email: "harbour@example.invalid" };
  const companies = [company, otherCompany];
  const timestamp = "2026-11-15T08:00:00.000Z";
  const drafts = companies.map(prospect => ({
    ...renderMoverOutreachEmail({
      templateKey: "MOVER_OPPORTUNITY",
      companyName: prospect.companyName,
      lead: { ...first, createdAt: timestamp, dateFlexible: false },
      registrationUrl: "https://example.invalid/register",
      unsubscribeUrl: "https://example.invalid/unsubscribe",
    }),
    id: `draft-${prospect.id}`,
    prospectId: prospect.id,
    prospect,
    quoteRequestId: first.id,
    templateKey: "MOVER_OPPORTUNITY",
    templateVersion: "test",
    sequence: 0,
    status: "DRAFT",
    introduction: "",
    updatedAt: timestamp,
    sentAt: null,
  }));
  const requests: string[] = [];
  const prepared: string[][] = [];
  const navigated: string[] = [];
  let returnWrongInvitation = false;
  globalThis.fetch = async (url, options) => {
    if (options?.method === "POST") {
      const { action, data } = JSON.parse(String(options.body));
      assert.equal(action, "prepare");
      assert.equal(data.quoteRequestId, first.id);
      prepared.push(data.prospectIds);
      const messages = drafts.filter(draft => data.prospectIds.includes(draft.prospectId));
      return Response.json({ messages: returnWrongInvitation ? messages.map(draft => ({ ...draft, quoteRequestId: null, templateKey: "MOVER_GENERAL" })) : messages });
    }
    const query = new URL(String(url), dom.window.location.origin).searchParams;
    requests.push(query.toString());
    if (query.get("view") === "leads") return Response.json({ items: [first, second], count: 2 });
    if (query.get("view") === "messages") return Response.json(drafts.filter(draft => query.getAll("id").includes(draft.id)));
    if (query.get("view") === "email_station") return Response.json({ sendingReady: true });
    if (query.get("id") === first.id) return Response.json({ lead: first, items: companies, truncated: false });
    assert.equal(query.get("id"), second.id);
    return pendingSecond;
  };
  let finishSecond!: (response: Response) => void;
  const pendingSecond = new Promise<Response>((resolve) => { finishSecond = resolve; });

  const router = { bfcacheId: "lead-opportunities", back() {}, forward() {}, refresh() {}, hmrRefresh() {}, replace() {}, push(url: string) { navigated.push(url); }, prefetch: async () => {} };
  const actor = { id: "owner", name: "Owner", role: "OWNER", canViewLeads: true, canSend: true } as const;
  const render = async (section: string, search = "") => React.act(async () => root.render(React.createElement(AppRouterContext.Provider, { value: router },
    React.createElement(SearchParamsContext.Provider, { value: new URLSearchParams(search) },
      React.createElement(RecruitmentWorkspace, { actor, section }),
    ),
  )));

  const document = dom.window.document;
  const clickLead = async (origin: string) => React.act(async () => {
    const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes(origin));
    assert.ok(button, `Lead from ${origin} is visible`);
    button.click();
  });
  const invitationButton = () => [...document.querySelectorAll("button")].find((button) => button.textContent?.startsWith("Prepare"));
  await render("leads");
  assert.match(document.body.textContent!, /Moving requests/);
  await clickLead(first.origin);
  assert.match(document.body.textContent!, /North Shore Removals/);
  const checkbox = document.querySelector<HTMLInputElement>('input[type="checkbox"]');
  assert.ok(checkbox);
  await React.act(async () => checkbox.click());
  assert.equal(invitationButton()?.disabled, false);

  await clickLead(second.origin);
  assert.doesNotMatch(document.body.textContent!, /North Shore Removals|No eligible companies found/);
  assert.match(document.querySelector('[role="status"]')?.textContent ?? "", /Loading/);
  assert.equal(invitationButton()?.disabled, true);
  await React.act(async () => finishSecond(Response.json({ error: "Lead summary not found." }, { status: 404 })));
  assert.equal(document.querySelector('[role="alert"]')?.textContent, "Lead summary not found.");
  assert.doesNotMatch(document.body.textContent!, /North Shore Removals|No eligible companies found/);
  assert.deepEqual(requests, ["view=leads&page=1", "view=matches&id=first", "view=matches&id=second"]);

  await clickLead(first.origin);
  const [firstCompany, secondCompany] = [...document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
  await React.act(async () => firstCompany.click());
  returnWrongInvitation = true;
  await React.act(async () => invitationButton()?.click());
  assert.match(document.querySelector('[role="alert"]')?.textContent ?? "", /selected moving request/);
  assert.deepEqual(navigated, []);

  returnWrongInvitation = false;
  await React.act(async () => invitationButton()?.click());
  assert.deepEqual(navigated, ["/admin/recruitment/messages?id=draft-company"]);
  await React.act(async () => secondCompany.click());
  await React.act(async () => invitationButton()?.click());
  assert.deepEqual(prepared, [[company.id], [company.id], [company.id, otherCompany.id]]);
  const review = new URL(navigated.at(-1)!, dom.window.location.origin);
  assert.deepEqual(review.searchParams.getAll("id"), ["draft-company", "draft-other-company"]);

  await render("messages", review.search);
  assert.ok(requests.includes("view=messages&id=draft-company&id=draft-other-company"));
  assert.match(document.body.textContent!, /North Shore Removals/);
  assert.match(document.body.textContent!, /Harbour Movers/);
  const preview = document.querySelector<HTMLIFrameElement>('iframe[title="Invitation preview for North Shore Removals"]');
  assert.match(preview?.srcdoc ?? "", /Moving from:<\/strong> Auckland/);
  assert.match(preview?.srcdoc ?? "", /Moving to:<\/strong> Northland/);
  assert.match(document.querySelector("pre")?.textContent ?? "", /Preferred moving date: 2026-11-18/);
  const openSecond = [...document.querySelectorAll("button")].find(button => button.textContent === "Preview Email");
  assert.ok(openSecond);
  await React.act(async () => openSecond.click());
  assert.match(document.querySelector<HTMLIFrameElement>('iframe[title="Invitation preview for Harbour Movers"]')?.srcdoc ?? "", /Moving to:<\/strong> Northland/);
});
