import assert from "node:assert/strict";
import test from "node:test";
import { createServer, type Socket } from "node:net";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/db";
import { locked, prepareDraft, saveProspect, suppressContact, emailReady, verifyRecruitmentSender } from "../lib/recruitment";
import { approveAndSend, editDraft, claimRegistrationAttribution } from "../lib/recruitment-outreach";
import { secureToken } from "../lib/recruitment-policy";

const database = process.env.GENERAL_EMAIL_TEST_DATABASE_URL;
test("general company emails work without customer leads or lead permissions", { skip: !database, timeout: 120000 }, async t => {
  const url = new URL(database!);
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname));
  assert.ok(url.pathname.endsWith("_test"));
  assert.equal(process.env.DATABASE_URL, database);
  const accepted: string[] = [];
  const sockets = new Set<Socket>();
  const smtp = createServer(socket => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.write("220 localhost test mail catcher\r\n");
    let buffer = "";
    let data = false;
    socket.on("data", chunk => {
      buffer += chunk.toString();
      while (buffer.includes("\r\n")) {
        if (data) {
          const end = buffer.indexOf("\r\n.\r\n");
          if (end < 0) return;
          accepted.push(buffer.slice(0, end));
          buffer = buffer.slice(end + 5);
          data = false;
          socket.write("250 accepted locally\r\n");
          continue;
        }
        const end = buffer.indexOf("\r\n");
        const command = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (command.startsWith("EHLO")) socket.write("250-localhost\r\n250 AUTH PLAIN\r\n");
        else if (command.startsWith("AUTH")) socket.write("235 authenticated\r\n");
        else if (command === "DATA") { data = true; socket.write("354 end with dot\r\n"); }
        else if (command === "QUIT") socket.end("221 bye\r\n");
        else socket.write("250 ok\r\n");
      }
    });
  });
  await new Promise<void>(resolve => smtp.listen(0, "127.0.0.1", resolve));
  const address = smtp.address();
  assert.ok(address && typeof address === "object");
  Object.assign(process.env, {
    SMTP_HOST: "127.0.0.1", SMTP_PORT: String(address.port), SMTP_USER: "test-only", SMTP_PASS: secureToken(),
    SMTP_SECURE: "false", SMTP_REQUIRE_TLS: "false", EMAIL_SMTP_POOL: "false",
    RECRUITMENT_FROM_EMAIL: "recruitment@validation.invalid", RECRUITMENT_EMAIL_VERIFIED: "true",
    NEXTAUTH_URL: "http://127.0.0.1:3110",
  });
  t.after(async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>(resolve => smtp.close(() => resolve()));
    await prisma.$disconnect();
  });
  const tag = randomUUID();
  const user = await prisma.user.create({ data: { name: "Email colleague", email: `colleague-${tag}@validation.invalid`, passwordHash: "unused-test-value", role: "ADMIN", adminRole: "RECRUITMENT_ADMIN", emailVerifiedAt: new Date(), canSendRecruitment: false, canViewRecruitmentLeads: false } });
  const actor = { id: user.id, role: "RECRUITMENT_ADMIN" as const, canSend: false, canViewLeads: false };
  const ownerUser = await prisma.user.create({ data: { name: "Setup owner", email: `setup-${tag}@validation.invalid`, passwordHash: "unused-test-value", role: "ADMIN", adminRole: "OWNER" } });
  const owner = { ...actor, id: ownerUser.id, role: "OWNER" as const };
  const other = await prisma.user.create({ data: { name: "Other colleague", email: `other-${tag}@validation.invalid`, passwordHash: "unused-test-value", role: "ADMIN", adminRole: "RECRUITMENT_ADMIN" } });
  const input = { companyName: `General Movers ${tag}`, email: `mover-${tag}@validation.invalid`, serviceAreas: ["Auckland"], consentBasis: "EXPRESS", consentEvidence: "Explicit local testing permission" };
  await t.test("only an owner can verify the sender, without sending an email, and changed credentials require a new check", async () => {
    process.env.RECRUITMENT_EMAIL_VERIFIED = "false";
    assert.equal(await emailReady(), false);
    await assert.rejects(verifyRecruitmentSender(actor), /Owner access/);
    await verifyRecruitmentSender(owner);
    assert.equal(await emailReady(), true);
    const password = process.env.SMTP_PASS;
    process.env.SMTP_PASS = "different-test-credential";
    assert.equal(await emailReady(), false);
    process.env.SMTP_PASS = password;
    assert.equal(accepted.length, 0);
  });
  const prospect = await locked(tx => saveProspect(tx, actor, input));
  await prisma.recruitmentSetting.upsert({ where: { key: "outreach" }, create: { key: "outreach", value: { sendingEnabled: true, senderIdentity: "Match 'n Move · validation only" } }, update: { value: { sendingEnabled: true, senderIdentity: "Match 'n Move · validation only" } } });
  const quoteCount = await prisma.quoteRequest.count();
  const drafts = await Promise.all([1, 2].map(() => locked(tx => prepareDraft(tx, actor, prospect.id))));
  let draft = drafts[0];
  await t.test("no quote is fabricated and concurrent preparation reuses one initial draft", async () => {
    assert.equal(draft.id, drafts[1].id);
    assert.equal(draft.quoteRequestId, null);
    assert.equal(await prisma.quoteRequest.count(), quoteCount);
    assert.equal(draft.text.includes("Moving date:"), false);
    await assert.rejects(prisma.outreachMessage.create({ data: { ...draft, id: randomUUID(), attributionHash: secureToken(), unsubscribeHash: secureToken() } }), /Unique constraint/);
    assert.equal(accepted.length, 0);
  });
  await t.test("company ownership, sending permissions and stale edits are enforced", async () => {
    await assert.rejects(locked(tx => prepareDraft(tx, { ...actor, id: other.id }, prospect.id)), /Company not found/);
    await assert.rejects(approveAndSend(actor, { id: draft.id, updatedAt: draft.updatedAt.toISOString(), confirmed: true }), /enable your sending/);
    const oldTimestamp = draft.updatedAt.toISOString();
    draft = await locked(tx => editDraft(tx, actor, { id: draft.id, updatedAt: oldTimestamp, introduction: "We would love to welcome your moving company to our New Zealand platform." }));
    await assert.rejects(locked(tx => editDraft(tx, actor, { id: draft.id, updatedAt: oldTimestamp, introduction: draft.introduction })), /draft changed/);
    assert.equal(draft.quoteRequestId, null);
  });
  await prisma.user.update({ where: { id: user.id }, data: { canSendRecruitment: true } });
  await t.test("a colleague without lead access can approve one email and concurrent clicks cannot duplicate delivery", async () => {
    const results = await Promise.allSettled([1, 2].map(() => approveAndSend({ ...actor, canSend: true }, { id: draft.id, updatedAt: draft.updatedAt.toISOString(), confirmed: true })));
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(accepted.length, 1);
    const sent = await prisma.outreachMessage.findUniqueOrThrow({ where: { id: draft.id } });
    assert.equal(sent.status, "SENT");
    assert.equal(sent.quoteRequestId, null);
    const task = await prisma.recruitmentTask.findUniqueOrThrow({ where: { dedupeKey: `follow-up:${draft.id}` } });
    assert.equal(task.quoteRequestId, null);
  });
  await t.test("general follow-ups remain lead-independent and obey the company contact limit", async () => {
    const follow = await locked(tx => prepareDraft(tx, actor, prospect.id, null, draft.id));
    assert.equal(follow.quoteRequestId, null);
    assert.equal(follow.text.includes("original moving request"), false);
    await assert.rejects(approveAndSend(actor, { id: follow.id, updatedAt: follow.updatedAt.toISOString(), confirmed: true }), /last 24 hours/);
    assert.equal(accepted.length, 1);
  });
  await t.test("suppression blocks general outreach as well as lead invitations", async () => {
    await locked(tx => suppressContact(tx, prospect.email, "Recipient request", "local-test"));
    await assert.rejects(locked(tx => prepareDraft(tx, actor, prospect.id)), /suppressed/);
  });
  await t.test("registration attribution also works for a general invitation", async () => {
    const second = await locked(tx => saveProspect(tx, actor, { ...input, companyName: `Attribution ${tag}`, email: `attribution-${tag}@validation.invalid` }));
    const invite = await locked(tx => prepareDraft(tx, actor, second.id));
    await approveAndSend(actor, { id: invite.id, updatedAt: invite.updatedAt.toISOString(), confirmed: true });
    const token = invite.text.match(/attribution\?token=(\S+)/)?.[1];
    assert.ok(token);
    const mover = await prisma.user.create({ data: { email: second.email, passwordHash: "unused-test-value", moverCompany: { create: { companyName: second.companyName, serviceAreas: ["Auckland"] } } }, include: { moverCompany: true } });
    await locked(tx => claimRegistrationAttribution(tx, token, mover.id, mover.email, mover.moverCompany!.id));
    assert.equal((await prisma.moverProspect.findUniqueOrThrow({ where: { id: second.id } })).status, "REGISTRATION_STARTED");
  });
});
