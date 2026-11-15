import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

test("lead opportunities loads only the selected request's company suggestions", async (t) => {
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
  const requests: string[] = [];
  globalThis.fetch = async (url) => {
    const query = new URL(String(url), dom.window.location.origin).searchParams;
    requests.push(query.toString());
    if (query.get("view") === "leads") return Response.json({ items: [first, second], count: 2 });
    if (query.get("id") === first.id) return Response.json({ lead: first, items: [company], truncated: false });
    assert.equal(query.get("id"), second.id);
    return pendingSecond;
  };
  let finishSecond!: (response: Response) => void;
  const pendingSecond = new Promise<Response>((resolve) => { finishSecond = resolve; });

  const router = { bfcacheId: "lead-opportunities", back() {}, forward() {}, refresh() {}, hmrRefresh() {}, replace() {}, push() {}, prefetch: async () => {} };
  const actor = { id: "owner", name: "Owner", role: "OWNER", canViewLeads: true, canSend: true } as const;
  await React.act(async () => root.render(React.createElement(AppRouterContext.Provider, { value: router },
    React.createElement(SearchParamsContext.Provider, { value: new URLSearchParams() },
      React.createElement(RecruitmentWorkspace, { actor, section: "leads" }),
    ),
  )));

  const document = dom.window.document;
  const clickLead = async (origin: string) => React.act(async () => {
    const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes(origin));
    assert.ok(button, `Lead from ${origin} is visible`);
    button.click();
  });
  const invitationButton = () => [...document.querySelectorAll("button")].find((button) => button.textContent?.startsWith("Prepare"));
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
});
