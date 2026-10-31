import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/db";
import { createSessionToken } from "../lib/auth";
import { locked, saveProspect } from "../lib/recruitment";

const base = process.env.INBOX_TEST_BASE_URL;
test(
  "inbox HTTP endpoints preserve MFA, permissions, ownership and outreach separation",
  { skip: !base, timeout: 120000 },
  async (t) => {
    assert.ok(["127.0.0.1", "localhost"].includes(new URL(base!).hostname));
    const database = new URL(process.env.INBOX_TEST_DATABASE_URL!);
    assert.ok(["127.0.0.1", "localhost"].includes(database.hostname));
    assert.ok(database.pathname.endsWith("_test"));
    assert.equal(
      process.env.DATABASE_URL,
      database.toString().replace(/\/$/, ""),
    );
    const tag = randomUUID();
    const make = (
      name: string,
      role: "OWNER" | "RECRUITMENT_ADMIN" | "MOVER" = "RECRUITMENT_ADMIN",
      enabled = true,
    ) =>
      prisma.user.create({
        data: {
          email: `${name}-${tag}@validation.invalid`,
          name,
          passwordHash: "unused",
          role: role === "MOVER" ? "MOVER" : "ADMIN",
          adminRole: role === "MOVER" ? null : role,
          canAccessPartnerInbox: enabled,
          canSendPartnerInbox: enabled,
        },
      });
    const owner = await make("http-owner", "OWNER"),
      colleague = await make("http-colleague"),
      other = await make("http-other"),
      denied = await make("http-denied", "RECRUITMENT_ADMIN", false),
      mover = await make("http-mover", "MOVER");
    const cookie = (user: typeof owner, mfaVerified = true) =>
      `mm_session=${createSessionToken({ userId: user.id, email: user.email, role: user.role, mfaVerified, sessionVersion: user.sessionVersion })}`;
    const get = (path: string, user?: typeof owner, mfa = true) =>
      fetch(`${base}${path}`, {
        headers: user ? { Cookie: cookie(user, mfa) } : {},
        redirect: "manual",
      });
    const post = (
      action: string,
      data: unknown,
      user = owner,
      origin = base!,
    ) =>
      fetch(`${base}/api/admin/inbox`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          Cookie: cookie(user),
        },
        body: JSON.stringify({ action, data }),
        redirect: "manual",
      });
    t.after(async () => {
      await prisma.$disconnect();
    });
    const actor = {
      id: colleague.id,
      role: "RECRUITMENT_ADMIN" as const,
      canSend: false,
      canViewLeads: false,
    };
    const prospect = await locked((tx) =>
      saveProspect(tx, actor, {
        companyName: `HTTP Inbox Partner ${tag}`,
        email: `http-partner-${tag}@validation.invalid`,
        emailAvailability: "PUBLIC",
        phoneAvailability: "NOT_PUBLIC",
        serviceAreas: ["Auckland"],
        consentBasis: "UNKNOWN",
        consentEvidence: "",
      }),
    );
    const conversation = await prisma.partnerConversation.create({
      data: {
        subject: `HTTP thread ${tag}`,
        participants: [prospect.email!],
        prospectId: prospect.id,
        assignedAdminId: colleague.id,
        labels: [],
      },
    });
    const message = await prisma.partnerMessage.create({
      data: {
        conversationId: conversation.id,
        from: prospect.email!,
        to: ["support@matchnmove.co.nz"],
        cc: [],
        bcc: [],
        subject: conversation.subject,
        text: "An actual local fixture, never a production lead",
        direction: "INBOUND",
        providerLabels: ["INBOX"],
        references: [],
        rfcMessageId: `<http-${tag}@validation.invalid>`,
      },
    });
    await t.test(
      "anonymous, non-admin, incomplete MFA and non-enabled colleagues cannot read inbox data",
      async () => {
        for (const [person, mfa] of [
          [undefined, true],
          [mover, true],
          [colleague, false],
        ] as const)
          assert.equal(
            (await get("/api/admin/inbox?view=summary", person, mfa)).status,
            401,
          );
        assert.equal(
          (await get("/api/admin/inbox?view=summary", denied)).status,
          403,
        );
        assert.equal(
          (
            await get(
              `/api/admin/inbox?view=conversation&id=${conversation.id}`,
              other,
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await get(
              `/api/admin/inbox?view=conversation&id=${conversation.id}`,
              colleague,
            )
          ).status,
          200,
        );
      },
    );
    await t.test(
      "every privileged setup operation is owner-only and mutations reject foreign origins",
      async () => {
        assert.equal(
          (
            await post(
              "note",
              { id: conversation.id, text: "Denied cross-origin note" },
              colleague,
              "https://attacker.invalid",
            )
          ).status,
          403,
        );
        for (const action of [
          "configure",
          "disconnect",
          "access",
          "sync",
          "review_send",
        ])
          assert.equal((await post(action, {}, colleague)).status, 403);
        assert.equal(
          (await get("/api/admin/inbox/oauth", colleague)).status,
          403,
        );
        assert.equal(
          (await get("/api/admin/inbox?view=access", colleague)).status,
          403,
        );
      },
    );
    await t.test(
      "safe HTML page renders inbox structure and connection instructions",
      async () => {
        const response = await get("/admin/inbox", owner);
        assert.equal(response.status, 200);
        const html = await response.text();
        assert.match(html, /Partner communications/);
        assert.match(html, /Inbox folders/);
        assert.doesNotMatch(
          html,
          /local-only-token|encryptedRefreshToken|encryptedClientConfig/,
        );
      },
    );
    await t.test(
      "notes are private, scoped and retained on the company conversation",
      async () => {
        assert.equal(
          (
            await post(
              "note",
              { id: conversation.id, text: "Private company history" },
              colleague,
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await post(
              "note",
              { id: conversation.id, text: "Not my conversation" },
              other,
            )
          ).status,
          404,
        );
        const response = await get(
          `/api/admin/inbox?view=conversation&id=${conversation.id}`,
          colleague,
        );
        const row = await response.json();
        assert.ok(
          row.notes.some(
            (note: { text: string }) => note.text === "Private company history",
          ),
        );
      },
    );
    await t.test(
      "phone calls require a number; research task persists kind, due date, priority and notes",
      async () => {
        const task = {
          id: conversation.id,
          title: "Research contact details",
          description: "Confirm business phone",
          dueAt: new Date().toISOString(),
          priority: "HIGH",
          kind: "CALL",
        };
        assert.equal((await post("task", task, colleague)).status, 400);
        const response = await post(
          "task",
          { ...task, kind: "RESEARCH" },
          colleague,
        );
        assert.equal(response.status, 200, await response.clone().text());
        const result = await response.json();
        assert.equal(result.kind, "RESEARCH");
        assert.equal(result.conversationId, conversation.id);
        assert.equal(result.assignedAdminId, colleague.id);
        const legacyTasks = await (
          await get("/api/admin/recruitment?view=tasks", colleague)
        ).json();
        assert.ok(
          !legacyTasks.some((item: { id: string }) => item.id === result.id),
          "Private inbox tasks must not leak through the older task screen",
        );
        const legacyCompany = await (
          await get(
            `/api/admin/recruitment?view=prospect&id=${prospect.id}`,
            colleague,
          )
        ).json();
        assert.ok(
          !legacyCompany.tasks.some(
            (item: { id: string }) => item.id === result.id,
          ),
        );
        const legacyComplete = await fetch(`${base}/api/admin/recruitment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: base!,
            Cookie: cookie(colleague),
          },
          body: JSON.stringify({
            action: "complete_task",
            data: { id: result.id },
          }),
        });
        assert.equal(legacyComplete.status, 404);
        assert.equal(
          (await post("complete_task", { id: result.id }, other)).status,
          404,
        );
        assert.equal(
          (await post("complete_task", { id: result.id }, colleague)).status,
          200,
        );
      },
    );
    await t.test(
      "conversation versions, valid assignees and phone labels are enforced",
      async () => {
        assert.equal(
          (
            await post(
              "update",
              { id: conversation.id, version: -1, status: "RESOLVED" },
              colleague,
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await post(
              "update",
              { id: conversation.id, version: 0, labels: ["NEEDS_PHONE_CALL"] },
              colleague,
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await post(
              "update",
              { id: conversation.id, version: 0, assignedAdminId: denied.id },
              owner,
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await post(
              "update",
              {
                id: conversation.id,
                version: 0,
                status: "PENDING",
                labels: ["INFORMATION_REQUESTED"],
              },
              colleague,
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await post(
              "update",
              { id: conversation.id, version: 1, assignedAdminId: other.id },
              colleague,
            )
          ).status,
          403,
        );
      },
    );
    await t.test(
      "unreviewed marketing stays blocked; a genuine enquiry reply remains available",
      async () => {
        assert.equal(
          (
            await post(
              "draft",
              {
                mode: "new",
                to: [prospect.email],
                subject: "Introduction",
                text: "We would like to introduce Match n Move to your business.",
                purpose: "OUTREACH",
              },
              colleague,
            )
          ).status,
          400,
        );
        const response = await post(
          "draft",
          {
            mode: "reply",
            conversationId: conversation.id,
            parentId: message.id,
            to: [prospect.email],
            subject: "Re: enquiry",
            text: "Thank you for your enquiry. We can help.",
            purpose: "REPLY",
          },
          colleague,
        );
        assert.equal(response.status, 200, await response.clone().text());
        const draft = await response.json();
        assert.equal(
          (
            await post(
              "send",
              { id: draft.id, version: draft.version, confirmed: false },
              colleague,
            )
          ).status,
          400,
        );
        const attachment = await prisma.partnerAttachment.create({
          data: {
            messageId: message.id,
            fileName: "insurance.pdf",
            mimeType: "application/pdf",
            size: 120,
          },
        });
        assert.equal(
          (await get(`/api/admin/inbox/attachments/${attachment.id}`, other))
            .status,
          403,
        );
        const upload = await fetch(`${base}/api/admin/inbox/attachments`, {
          method: "POST",
          headers: {
            Origin: "https://attacker.invalid",
            Cookie: cookie(colleague),
          },
          body: new FormData(),
        });
        assert.equal(upload.status, 400);
      },
    );
    await t.test(
      "pipeline transition uses existing ownership and stamps interest",
      async () => {
        assert.equal(
          (
            await post(
              "stage",
              {
                id: conversation.id,
                version: prospect.version,
                stage: "INTERESTED",
              },
              colleague,
            )
          ).status,
          200,
        );
        const row = await prisma.moverProspect.findUniqueOrThrow({
          where: { id: prospect.id },
        });
        assert.equal(row.status, "INTERESTED");
        assert.ok(row.interestedAt);
        assert.equal(
          (
            await post(
              "stage",
              {
                id: conversation.id,
                version: row.version,
                stage: "REGISTERED",
              },
              colleague,
            )
          ).status,
          400,
        );
      },
    );
    await t.test(
      "assigning a follow-up transfers its conversation so the assignee has context",
      async () => {
        const response = await post(
          "task",
          {
            id: conversation.id,
            title: "Send requested pricing",
            description: "Private pricing discussion",
            kind: "PRICING",
            priority: "HIGH",
            dueAt: new Date().toISOString(),
            assignedAdminId: other.id,
          },
          owner,
        );
        assert.equal(response.status, 200, await response.clone().text());
        assert.equal((await response.json()).assignedAdminId, other.id);
        assert.equal(
          (
            await get(
              `/api/admin/inbox?view=conversation&id=${conversation.id}`,
              other,
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await get(
              `/api/admin/inbox?view=conversation&id=${conversation.id}`,
              colleague,
            )
          ).status,
          404,
        );
      },
    );
    await t.test(
      "Google OAuth requires CSRF state; stored settings are encrypted and never returned",
      async () => {
        const response = await post(
          "configure",
          {
            clientId: "local-http-test.apps.googleusercontent.com",
            clientSecret: "local-only-test-secret",
          },
          owner,
        );
        assert.equal(response.status, 200);
        const stored = await prisma.partnerMailbox.findUniqueOrThrow({
          where: { id: "support" },
        });
        assert.ok(stored.encryptedClientConfig);
        assert.doesNotMatch(
          stored.encryptedClientConfig!,
          /local-only-test-secret/,
        );
        const summary = await (
          await get("/api/admin/inbox?view=summary", owner)
        ).text();
        assert.doesNotMatch(
          summary,
          /local-only-test-secret|encryptedClientConfig|encryptedRefreshToken/,
        );
        const start = await get("/api/admin/inbox/oauth", owner);
        assert.equal(start.status, 307);
        assert.match(start.headers.get("location")!, /accounts.google.com/);
        assert.match(start.headers.get("set-cookie")!, /HttpOnly/i);
        const callback = await get(
          "/api/admin/inbox/oauth/callback?state=wrong&code=wrong",
          owner,
        );
        assert.equal(callback.status, 307);
        assert.match(callback.headers.get("location")!, /connectionError/);
      },
    );
    await t.test(
      "owner access grants are independent of marketing permissions and revoke old sessions",
      async () => {
        const response = await post(
          "access",
          { userId: denied.id, canAccess: true, canSend: true },
          owner,
        );
        assert.equal(response.status, 200);
        const row = await prisma.user.findUniqueOrThrow({
          where: { id: denied.id },
        });
        assert.equal(row.canAccessPartnerInbox, true);
        assert.equal(row.canSendPartnerInbox, true);
        assert.equal(row.canSendRecruitment, false);
        assert.equal(
          (await get("/api/admin/inbox?view=summary", denied)).status,
          401,
        );
        assert.equal(
          (
            await post(
              "access",
              { userId: owner.id, canAccess: false, canSend: false },
              owner,
            )
          ).status,
          400,
        );
      },
    );
  },
);
