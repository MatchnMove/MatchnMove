import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

test("directory stage dropdown saves through existing status rules and handles errors safely", async t => {
  const dom = new JSDOM("<div id='root'></div>", { url: "https://www.matchnmove.co.nz/admin/recruitment/prospects" });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({ window: dom.window, self: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { CompanyStageSelect } = await import("../components/company-stage-select");
  const root = createRoot(dom.window.document.getElementById("root")!);
  const originalFetch = globalThis.fetch;
  const calls: Array<{ action: string; data: { id: string; version: number; status: string } }> = [];
  let handler: () => Promise<Response> = async () => Response.json({ ok: true });
  globalThis.fetch = (async (path, init) => {
    assert.equal(path, "/api/admin/recruitment");
    assert.equal(init?.method, "POST");
    calls.push(JSON.parse(String(init?.body)));
    return handler();
  }) as typeof fetch;
  let confirm = false;
  let confirmations = 0;
  dom.window.confirm = () => { confirmations++; return confirm; };
  t.after(async () => {
    await React.act(async () => root.unmount());
    globalThis.fetch = originalFetch;
    for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
    dom.window.close();
  });
  let status = "NOT_CONTACTED";
  let version = 4;
  let reloads = 0;
  let refreshedStatus: string | null = null;
  async function render() {
    root.render(React.createElement(CompanyStageSelect, { id: "example-company", companyName: "Example Movers", status, version, onSaved: async () => {
      reloads++;
      if (refreshedStatus) { status = refreshedStatus; version++; await render(); }
    } }));
  }
  const select = () => dom.window.document.querySelector("select")!;
  async function change(value: string) {
    await React.act(async () => {
      select().value = value;
      select().dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
  }
  await React.act(render);
  assert.equal(select().getAttribute("aria-label"), "Change stage for Example Movers");
  assert.ok([...select().options].some(option => option.value === "INTERESTED"));
  assert.ok(![...select().options].some(option => option.value === "REGISTERED"));
  refreshedStatus = "INTERESTED";
  await change("INTERESTED");
  assert.deepEqual(calls[0], { action: "status", data: { id: "example-company", version: 4, status: "INTERESTED" } });
  assert.equal(select().value, "INTERESTED");
  assert.equal(confirmations, 0);
  assert.equal(reloads, 1);

  refreshedStatus = null;
  handler = async () => Response.json({ error: "This company changed. Reload before updating." }, { status: 409 });
  await change("CONTACTED");
  assert.equal(calls.at(-1)?.data.version, 5);
  assert.equal(select().value, "INTERESTED");
  assert.match(dom.window.document.querySelector('[role="alert"]')?.textContent || "", /company changed/);
  assert.equal(reloads, 2);

  let finish!: (response: Response) => void;
  handler = () => new Promise(resolve => { finish = resolve; });
  await change("FOLLOW_UP_REQUIRED");
  assert.equal(select().disabled, true);
  const pendingCalls = calls.length;
  await change("CONTACTED");
  assert.equal(calls.length, pendingCalls);
  refreshedStatus = "FOLLOW_UP_REQUIRED";
  await React.act(async () => finish(Response.json({ ok: true })));
  assert.equal(select().disabled, false);
  assert.equal(select().value, "FOLLOW_UP_REQUIRED");

  await change("NOT_INTERESTED");
  assert.equal(calls.length, pendingCalls);
  assert.equal(confirmations, 1);
  confirm = true;
  handler = async () => Response.json({ ok: true });
  refreshedStatus = "NOT_INTERESTED";
  await change("NOT_INTERESTED");
  assert.equal(select().value, "NOT_INTERESTED");
  assert.deepEqual([...select().options].map(option => option.value), ["NOT_INTERESTED", "DO_NOT_CONTACT"]);
  refreshedStatus = "DO_NOT_CONTACT";
  await change("DO_NOT_CONTACT");
  assert.equal(select().disabled, true);
  assert.equal(select().value, "DO_NOT_CONTACT");

  status = "ACTIVE_MOVER"; version++;
  await React.act(render);
  assert.deepEqual([...select().options].map(option => option.value), ["ACTIVE_MOVER", "DO_NOT_CONTACT"]);
});
