import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

test("inbox UI previews the final email, requires explicit send and keeps failed internal notes", async (t) => {
  const dom = new JSDOM("<div id='root'></div>", {
    url: "https://www.matchnmove.co.nz/admin/inbox",
  });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  const scrolled: Element[] = [];
  dom.window.HTMLElement.prototype.scrollIntoView = function () {
    scrolled.push(this);
  };
  for (const [key, value] of Object.entries({
    window: dom.window,
    self: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    Event: dom.window.Event,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  }
  const React = await import("react"),
    { createRoot } = await import("react-dom/client");
  const { PartnerInbox } = await import("../components/partner-inbox");
  const root = createRoot(dom.window.document.getElementById("root")!);
  const originalFetch = globalThis.fetch;
  const calls: Array<{ action: string; data: Record<string, unknown> }> = [];
  const inbound = {
    id: "received",
    conversationId: "thread",
    parentMessageId: null,
    inReplyTo: null,
    composeText: null,
    from: "partner@example.com",
    to: ["support@matchnmove.co.nz"],
    cc: [],
    bcc: [],
    subject: "Partner question",
    text: "Please help with onboarding.",
    html: null,
    direction: "INBOUND",
    status: "SYNCED",
    receivedAt: new Date().toISOString(),
    sentAt: null,
    version: 0,
    authorId: null,
    purpose: "REPLY",
    serviceReason: null,
    attachments: [],
    lastError: null,
  };
  const conversation = {
    id: "thread",
    subject: "Partner question",
    preview: inbound.text,
    participants: [inbound.from],
    status: "OPEN",
    waitingFor: "TEAM",
    unread: true,
    archived: false,
    spam: false,
    labels: [],
    version: 0,
    prospect: null,
    assignedAdmin: null,
    assignedAdminId: "admin",
    draftOwnerId: null,
    draftLeaseUntil: null,
    lastMessageAt: inbound.receivedAt,
    messages: [inbound] as unknown[],
    notes: [],
    tasks: [],
    activities: [],
    messageCount: 1,
  };
  const summary = {
    actor: { id: "admin", role: "RECRUITMENT_ADMIN", canInboxSend: true },
    configured: true,
    attachmentScanningConfigured: true,
    mailbox: {
      connected: true,
      address: "support@matchnmove.co.nz",
      initialSyncComplete: true,
    },
    unread: 1,
    waitingTeam: 1,
    waitingPartner: 0,
    due: 0,
    overdue: 0,
    resolved: 0,
    recent: [conversation],
  };
  const secondConversation = {
    ...conversation,
    id: "thread-2",
    subject: "Second onboarding thread",
    preview: "A different onboarding reply",
    messages: [
      {
        ...inbound,
        id: "received-2",
        conversationId: "thread-2",
        text: "Second company response",
      },
    ],
  };
  let deferFirst = false;
  let finishFirst: (() => void) | undefined;
  globalThis.fetch = (async (input, init) => {
    if (init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      calls.push(body);
      if (body.action === "note")
        return Response.json(
          { error: "Note could not be saved. Please retry." },
          { status: 503 },
        );
      if (body.action === "draft") {
        const draft = {
          ...inbound,
          id: "draft",
          from: "support@matchnmove.co.nz",
          to: [inbound.from],
          direction: "OUTBOUND",
          status: "DRAFT",
          version: 1,
          authorId: "admin",
          parentMessageId: "received",
          inReplyTo: "<received@example.com>",
          composeText: body.data.text,
          text: `${body.data.text}\n\nMANDATORY_RENDERED_FOOTER`,
        };
        conversation.messages.push(draft);
        return Response.json(draft);
      }
      return Response.json({ ok: true });
    }
    const query = new URL(String(input), dom.window.location.origin)
      .searchParams;
    const view = query.get("view");
    if (view === "conversation" && query.get("id") === "thread" && deferFirst)
      await new Promise<void>((resolve) => {
        finishFirst = resolve;
      });
    return Response.json(
      view === "summary"
        ? summary
        : view === "team"
          ? []
          : view === "conversation"
            ? query.get("id") === "thread-2"
              ? secondConversation
              : conversation
            : { items: [conversation, secondConversation], count: 2 },
    );
  }) as typeof fetch;
  dom.window.confirm = () => true;
  t.after(async () => {
    await React.act(async () => root.unmount());
    globalThis.fetch = originalFetch;
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    dom.window.close();
  });
  const buttons = () => [...dom.window.document.querySelectorAll("button")];
  const click = async (name: string) =>
    React.act(async () => {
      const element = buttons().find(
        (item) => item.textContent?.trim() === name,
      );
      assert.ok(element, `Button ${name} exists`);
      element.click();
    });
  const textValue = async (element: HTMLTextAreaElement, value: string) =>
    React.act(async () => {
      Object.getOwnPropertyDescriptor(
        dom.window.HTMLTextAreaElement.prototype,
        "value",
      )!.set!.call(element, value);
      element.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    });
  await React.act(async () => root.render(React.createElement(PartnerInbox)));
  assert.ok(dom.window.document.querySelector('[aria-label="Inbox folders"]'));
  const open = buttons().find((item) =>
    item.textContent?.includes("Please help with onboarding."),
  );
  assert.ok(open);
  await React.act(async () => open.click());
  const privateNote = dom.window.document.querySelector(
    'textarea[placeholder="Private team note"]',
  ) as HTMLTextAreaElement;
  await textValue(privateNote, "Keep this private note after a failed save");
  await React.act(async () =>
    privateNote
      .closest("form")!
      .dispatchEvent(
        new dom.window.Event("submit", { bubbles: true, cancelable: true }),
      ),
  );
  assert.match(
    dom.window.document.querySelector('[role="alert"]')!.textContent!,
    /Note could not be saved/,
  );
  assert.equal(privateNote.value, "Keep this private note after a failed save");
  await click("Reply");
  const body = [...dom.window.document.querySelectorAll("textarea")].find(
    (item) => item.maxLength === 100000,
  )!;
  await textValue(
    body,
    "Thank you for asking. Here is the requested information.",
  );
  await React.act(async () =>
    body
      .closest("form")!
      .dispatchEvent(
        new dom.window.Event("submit", { bubbles: true, cancelable: true }),
      ),
  );
  assert.match(
    dom.window.document.querySelector('[aria-label="Final email preview"]')!
      .textContent!,
    /MANDATORY_RENDERED_FOOTER/,
  );
  assert.equal(calls.filter((item) => item.action === "send").length, 0);
  assert.ok(calls.some((item) => item.action === "draft"));
  await click("Confirm and send");
  assert.equal(calls.filter((item) => item.action === "send").length, 1);
  assert.equal(
    calls.find((item) => item.action === "send")!.data.confirmed,
    true,
  );
  const reader = dom.window.document.querySelector(
    '[aria-label="Conversation details"]',
  ) as HTMLElement;
  const list = dom.window.document.querySelector(
    '[data-testid="inbox-list-viewport"]',
  ) as HTMLElement;
  reader.scrollTop = 1800;
  list.scrollTop = 900;
  await React.act(async () => {
    buttons()
      .find((item) => item.textContent?.includes("Second onboarding thread"))!
      .click();
  });
  assert.equal(
    reader.scrollTop,
    0,
    "Choosing another email resets the reading pane",
  );
  assert.equal(list.scrollTop, 900, "The email list retains its own position");
  assert.ok(
    scrolled.includes(reader),
    "Mobile selection brings the reading pane into view",
  );
  assert.match(reader.textContent!, /Second company response/);
  deferFirst = true;
  await React.act(async () => {
    buttons()
      .find((item) =>
        item.textContent?.includes("Please help with onboarding."),
      )!
      .click();
  });
  assert.ok(finishFirst);
  await React.act(async () => {
    buttons()
      .find((item) => item.textContent?.includes("Second onboarding thread"))!
      .click();
  });
  await React.act(async () => {
    finishFirst!();
  });
  assert.match(
    reader.textContent!,
    /Second company response/,
    "A slower earlier request cannot replace the selected email",
  );
});
