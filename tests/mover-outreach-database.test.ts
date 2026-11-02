import assert from "node:assert/strict";
import test from "node:test";
import { createServer, type Socket } from "node:net";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/db";
import { locked, prepareDraft, saveProspect, suppressContact } from "../lib/recruitment";
import { approveAndSend, editDraft } from "../lib/recruitment-outreach";
import { addAucklandCalendar } from "../lib/recruitment-dates";
import { manageCampaign, prepareCampaignStep, processMoverOutreachCampaigns, recordOutreachReply, stopOutreachAfterRegistration } from "../lib/mover-outreach-campaigns";
import { bridgeRecruitmentMessages } from "../lib/partner-inbox-outgoing";
import { persistGmailMessage } from "../lib/partner-inbox-sync";

const database = process.env.OUTREACH_TEST_DATABASE_URL;
test("mover campaign persistence, real SMTP, reply import and manual re-engagement on disposable PostgreSQL", { skip: !database, timeout: 180000 }, async t => {
  const url = new URL(database!);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
  assert.ok(url.pathname.endsWith("_test"));
  assert.equal(process.env.DATABASE_URL, database);
  const accepted: string[] = [];
  let mode: "OK" | "TEMPORARY" | "PERMANENT" | "UNCERTAIN" = "OK";
  const sockets = new Set<Socket>();
  const smtp = createServer(socket => {
    sockets.add(socket); socket.on("close", () => sockets.delete(socket));
    socket.write("220 localhost isolated test catcher\r\n");
    let buffer = "", data = false;
    socket.on("data", chunk => {
      buffer += chunk.toString();
      while (buffer.includes("\r\n")) {
        if (data) {
          const end = buffer.indexOf("\r\n.\r\n");
          if (end < 0) return;
          accepted.push(buffer.slice(0, end)); buffer = buffer.slice(end + 5); data = false;
          if (mode === "UNCERTAIN") { socket.destroy(); return; }
          socket.write("250 accepted locally\r\n"); continue;
        }
        const end = buffer.indexOf("\r\n"), command = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        if (command.startsWith("EHLO")) socket.write("250-localhost\r\n250 AUTH PLAIN\r\n");
        else if (command.startsWith("AUTH")) socket.write("235 authenticated\r\n");
        else if (command.startsWith("RCPT") && mode === "TEMPORARY") socket.write("451 temporary rejection\r\n");
        else if (command.startsWith("RCPT") && mode === "PERMANENT") socket.write("550 invalid recipient\r\n");
        else if (command === "DATA") { data = true; socket.write("354 end with dot\r\n"); }
        else if (command === "QUIT") socket.end("221 bye\r\n");
        else socket.write("250 ok\r\n");
      }
    });
  });
  await new Promise<void>(resolve => smtp.listen(0, "127.0.0.1", resolve));
  const address = smtp.address(); assert.ok(address && typeof address === "object");
  Object.assign(process.env, { SMTP_HOST: "127.0.0.1", SMTP_PORT: String(address.port), SMTP_USER: "isolated-test", SMTP_PASS: "isolated-test-only", SMTP_SECURE: "false", SMTP_REQUIRE_TLS: "false", EMAIL_SMTP_POOL: "false", RECRUITMENT_FROM_EMAIL: "support@matchnmove.co.nz", RECRUITMENT_REPLY_TO: "support@matchnmove.co.nz", RECRUITMENT_EMAIL_VERIFIED: "true", NEXTAUTH_URL: "http://127.0.0.1:3110" });
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise<void>(resolve => smtp.close(() => resolve())); await prisma.$disconnect(); });
  const tag = randomUUID();
  const owner = await prisma.user.create({ data: { name: "Outreach test owner", email: `owner-${tag}@validation.invalid`, role: "ADMIN", adminRole: "OWNER", passwordHash: "unused" } });
  const colleague = await prisma.user.create({ data: { name: "Other colleague", email: `colleague-${tag}@validation.invalid`, role: "ADMIN", adminRole: "RECRUITMENT_ADMIN", passwordHash: "unused" } });
  const actor = { id: owner.id, role: "OWNER" as const, canSend: true, canViewLeads: true };
  await prisma.recruitmentSetting.upsert({ where: { key: "outreach" }, create: { key: "outreach", value: { sendingEnabled: true, senderIdentity: "Match 'n Move", automaticFollowUpsEnabled: true, dailyLimit: 100 } }, update: { value: { sendingEnabled: true, senderIdentity: "Match 'n Move", automaticFollowUpsEnabled: true, dailyLimit: 100 } } });
  await prisma.partnerMailbox.upsert({ where: { id: "support" }, create: { id: "support", address: "support@matchnmove.co.nz", encryptedRefreshToken: "fixture-never-used-for-network", initialSyncComplete: true, lastSyncedAt: new Date() }, update: { initialSyncComplete: true, lastSyncedAt: new Date(), lastError: null } });
  let counter = 0;
  const company = async () => locked(tx => saveProspect(tx, actor, { companyName: `Approved Movers ${tag} ${++counter}`, contactName: "Alex", email: `mover-${counter}-${tag}@validation.invalid`, emailAvailability: "PUBLIC", phoneAvailability: "NOT_PUBLIC", businessType: "MOVING", serviceAreas: ["Auckland"], consentBasis: "EXPRESS", consentEvidence: "Isolated test recipient permission" }));
  const send = async (message: { id: string; updatedAt: Date }, automatic = false) => approveAndSend(actor, { id: message.id, updatedAt: message.updatedAt.toISOString(), confirmed: true }, automatic);
  const campaign = (id: string) => prisma.outreachCampaign.findUniqueOrThrow({ where: { id } });
  const makeSent = async () => { const prospect = await company(); const message = await locked(tx => prepareDraft(tx, actor, prospect.id)); assert.equal((await send(message)).ok, true); return { prospect, message, campaignId: message.campaignId! }; };
  const dueStep = async (campaignId: string, sequence: number) => {
    // Move previous approval records into the past to simulate a due campaign
    // while retaining the real send timestamps used by the date assertions.
    await prisma.outreachMessage.updateMany({ where: { campaignId, status: "SENT" }, data: { approvedAt: new Date(Date.now() - 25 * 3600000) } });
    await prisma.outreachCampaign.update({ where: { id: campaignId }, data: { nextSequence: sequence, nextDueAt: new Date(Date.now() - 1000) } });
    return locked(tx => prepareCampaignStep(tx, actor, campaignId, sequence));
  };

  const prospect = await company();
  const drafts = await Promise.all([1, 2].map(() => locked(tx => prepareDraft(tx, actor, prospect.id))));
  const initial = drafts[0], campaignId = initial.campaignId!;
  await t.test("concurrent preparation and initial approval create one Day 0 email and persisted calendar milestones", async () => {
    assert.equal(initial.id, drafts[1].id);
    assert.equal(await prisma.outreachCampaign.count({ where: { prospectId: prospect.id } }), 1);
    assert.equal(initial.subject, "Invitation to join the Match 'n Move mover network");
    assert.ok(initial.text.startsWith(`Hi Alex from ${prospect.companyName},`));
    const count = accepted.length;
    const results = await Promise.allSettled([send(initial), send(initial)]);
    assert.equal(results.filter(result => result.status === "fulfilled" && result.value.ok).length, 1);
    assert.equal(accepted.length, count + 1);
    const saved = await campaign(campaignId);
    assert.equal(saved.nextDueAt!.toISOString(), addAucklandCalendar(saved.initialSentAt!, { days: 7 }).toISOString());
    assert.equal(saved.revisitAt!.toISOString(), addAucklandCalendar(saved.initialSentAt!, { months: 3 }).toISOString());
    assert.equal(await prisma.emailDelivery.count({ where: { dedupeKey: `recruitment:${initial.id}` } }), 1);
  });

  await t.test("pause/resume enforces ownership, stale checks and future scheduled dates", async () => {
    const current = await campaign(campaignId);
    await assert.rejects(locked(tx => manageCampaign(tx, { ...actor, id: colleague.id, role: "RECRUITMENT_ADMIN" }, { campaignId, updatedAt: current.updatedAt.toISOString(), operation: "pause" })), /Company not found/);
    await locked(tx => manageCampaign(tx, actor, { campaignId, updatedAt: current.updatedAt.toISOString(), operation: "pause" }));
    await assert.rejects(locked(tx => prepareCampaignStep(tx, actor, campaignId, 1)), /not due or outreach is paused/);
    await assert.rejects(locked(tx => manageCampaign(tx, actor, { campaignId, updatedAt: current.updatedAt.toISOString(), operation: "resume" })), /campaign changed/);
    const paused = await campaign(campaignId);
    await locked(tx => manageCampaign(tx, actor, { campaignId, updatedAt: paused.updatedAt.toISOString(), operation: "resume" }));
    await assert.rejects(locked(tx => prepareCampaignStep(tx, actor, campaignId, 1)), /not due/);
  });

  await t.test("automatic follow-ups retain thread headers, omit the original opportunity and schedule from successful sends", async () => {
    const day0 = (await campaign(campaignId)).initialSentAt!;
    const first = await dueStep(campaignId, 1);
    assert.equal(first.quoteRequestId, null);
    assert.equal(first.subject, "Following up on your Match 'n Move invitation");
    assert.equal((await send(first, true)).ok, true);
    assert.ok(/In-Reply-To:\s+<recruitment_invitation\./i.test(accepted.at(-1)!), "SMTP follow-up includes its parent's RFC message ID");
    const current = await campaign(campaignId);
    assert.equal(current.nextSequence, 2);
    assert.equal(current.initialSentAt!.toISOString(), day0.toISOString());
    assert.equal(current.nextDueAt!.toISOString(), addAucklandCalendar(current.lastSentAt!, { days: 21 }).toISOString());
    assert.equal(current.revisitAt!.toISOString(), addAucklandCalendar(day0, { months: 3 }).toISOString());
  });

  await t.test("definitive temporary rejections retry one persisted message without duplicate accepted email", async () => {
    const second = await dueStep(campaignId, 2), before = accepted.length;
    mode = "TEMPORARY";
    assert.equal((await send(second, true)).status, "RETRY");
    const retry = await prisma.outreachMessage.findUniqueOrThrow({ where: { id: second.id } });
    assert.equal(retry.sendAttempts, 1);
    assert.ok(retry.retryAt);
    assert.equal(accepted.length, before);
    await assert.rejects(send(retry, true), /Retry is not due/);
    await prisma.outreachMessage.update({ where: { id: retry.id }, data: { retryAt: new Date(Date.now() - 1000) } });
    mode = "OK";
    assert.equal((await send(await prisma.outreachMessage.findUniqueOrThrow({ where: { id: retry.id } }), true)).ok, true);
    assert.equal(accepted.length, before + 1);
    assert.equal((await prisma.emailDelivery.findUniqueOrThrow({ where: { dedupeKey: `recruitment:${retry.id}` } })).attempts, 2);
    const current = await campaign(campaignId);
    assert.equal(current.nextDueAt!.toISOString(), addAucklandCalendar(current.lastSentAt!, { months: 1 }).toISOString());
  });

  await t.test("real anchored inbound replies stop outreach, record response status and create one review task", async () => {
    await bridgeRecruitmentMessages();
    const threads = await prisma.partnerMessage.findMany({ where: { outreachMessage: { campaignId } }, select: { conversationId: true } });
    assert.equal(new Set(threads.map(thread => thread.conversationId)).size, 1);
    const anchor = await prisma.partnerMessage.findUniqueOrThrow({ where: { outreachMessageId: initial.id } });
    const incoming = { id: `reply-${tag}`, threadId: `thread-${tag}`, internalDate: String(Date.now()), labelIds: ["INBOX", "UNREAD"], payload: { mimeType: "text/plain", headers: [{ name: "Message-ID", value: `<reply-${tag}@validation.invalid>` }, { name: "From", value: prospect.email! }, { name: "To", value: "support@matchnmove.co.nz" }, { name: "References", value: anchor.rfcMessageId! }, { name: "Subject", value: "Re: invitation" }], body: { data: Buffer.from("Please help us register.").toString("base64url") } } };
    await persistGmailMessage(incoming); await persistGmailMessage(incoming);
    assert.equal((await campaign(campaignId)).status, "STOPPED");
    assert.ok((await prisma.moverProspect.findUniqueOrThrow({ where: { id: prospect.id } })).respondedAt);
    assert.equal(await prisma.recruitmentTask.count({ where: { dedupeKey: `outreach-reply:${prospect.id}` } }), 1);
    await assert.rejects(locked(tx => prepareCampaignStep(tx, actor, campaignId, 3)), /response has been received/);
  });

  await t.test("the three-month review is queued even with automatic sending disabled and always requires manual approval", async () => {
    const review = await makeSent();
    const initialDate = (await campaign(review.campaignId)).initialSentAt!.toISOString();
    await prisma.outreachCampaign.update({ where: { id: review.campaignId }, data: { revisitAt: new Date(Date.now() - 1000) } });
    await prisma.outreachMessage.update({ where: { id: review.message.id }, data: { approvedAt: new Date(Date.now() - 90 * 86400000) } });
    await prisma.recruitmentSetting.update({ where: { key: "outreach" }, data: { value: { sendingEnabled: true, senderIdentity: "Match 'n Move", automaticFollowUpsEnabled: false, dailyLimit: 100 } } });
    const before = accepted.length;
    await processMoverOutreachCampaigns();
    const current = await campaign(review.campaignId);
    assert.equal(current.status, "REVIEW_DUE");
    assert.equal(current.initialSentAt!.toISOString(), initialDate);
    assert.equal(accepted.length, before);
    assert.equal(await prisma.recruitmentTask.count({ where: { dedupeKey: `outreach-revisit:${current.id}` } }), 1);
    const reengagement = await locked(tx => manageCampaign(tx, actor, { campaignId: current.id, updatedAt: current.updatedAt.toISOString(), operation: "reengage" }));
    assert.ok("id" in reengagement);
    const message = await prisma.outreachMessage.findUniqueOrThrow({ where: { id: reengagement.id as string } });
    assert.equal(message.templateKey, "MOVER_REENGAGEMENT");
    assert.equal(message.subject, `Reconnecting with ${review.prospect.companyName} | Match 'n Move`);
    await assert.rejects(send(message, true), /Automatic sending is limited/);
    assert.equal(accepted.length, before);
    assert.equal((await send(message)).ok, true);
    assert.equal((await campaign(current.id)).status, "CLOSED");
    await processMoverOutreachCampaigns();
    assert.equal(accepted.length, before + 1);
    await prisma.recruitmentSetting.update({ where: { key: "outreach" }, data: { value: { sendingEnabled: true, senderIdentity: "Match 'n Move", automaticFollowUpsEnabled: true, dailyLimit: 100 } } });
  });

  await t.test("registration without a tracking cookie and permanent suppression stop saved sequences", async () => {
    const registration = await makeSent();
    await locked(tx => stopOutreachAfterRegistration(tx, registration.prospect.email!));
    assert.equal((await campaign(registration.campaignId)).status, "STOPPED");
    const suppression = await makeSent();
    const pending = await dueStep(suppression.campaignId, 1);
    await locked(tx => suppressContact(tx, suppression.prospect.email!, "Unsubscribe", "isolated-test"));
    assert.equal((await campaign(suppression.campaignId)).status, "STOPPED");
    assert.equal((await prisma.outreachMessage.findUniqueOrThrow({ where: { id: pending.id } })).status, "CANCELLED");
    await assert.rejects(send(pending, true), /suppressed/);
  });

  await t.test("permanent failures suppress invalid recipients and uncertain SMTP acceptance never retries", async () => {
    const failure = await makeSent(); const pending = await dueStep(failure.campaignId, 1);
    mode = "PERMANENT"; await send(pending, true); mode = "OK";
    assert.ok(await prisma.contactSuppression.findUnique({ where: { email: failure.prospect.email! } }));
    assert.equal((await campaign(failure.campaignId)).status, "STOPPED");
    const uncertain = await makeSent(); const followup = await dueStep(uncertain.campaignId, 1);
    mode = "UNCERTAIN"; await send(followup, true); mode = "OK";
    const current = await prisma.outreachMessage.findUniqueOrThrow({ where: { id: followup.id } });
    assert.equal(current.status, "NEEDS_REVIEW"); assert.equal(current.retryAt, null);
    assert.equal((await campaign(uncertain.campaignId)).status, "PAUSED");
    const before = accepted.length;
    await assert.rejects(send(current, true), /needs review|paused, stopped/);
    assert.equal(accepted.length, before);
  });

  await t.test("per-email notes leave canonical copy intact and stale contact details require a new preview", async () => {
    const fresh = await company(); const draft = await locked(tx => prepareDraft(tx, actor, fresh.id));
    const adjusted = await locked(tx => editDraft(tx, actor, { id: draft.id, updatedAt: draft.updatedAt.toISOString(), introduction: "We spoke recently about your service areas." }));
    assert.match(adjusted.text, /We spoke recently/); assert.match(adjusted.text, /I'm reaching out to introduce Match 'n Move/);
    await prisma.moverProspect.update({ where: { id: fresh.id }, data: { contactName: "Changed Contact" } });
    await assert.rejects(send(adjusted), /details changed/);
    assert.equal((await prisma.outreachMessage.findUniqueOrThrow({ where: { id: draft.id } })).status, "DRAFT");
  });

  await t.test("the scheduler can restart or run concurrently without sending the same follow-up twice", async () => {
    const scheduled = await makeSent();
    await dueStep(scheduled.campaignId, 1);
    await prisma.partnerMailbox.update({ where: { id: "support" }, data: { lastSyncedAt: new Date(), lastError: null, initialPageToken: null } });
    const before = accepted.length;
    await Promise.all([processMoverOutreachCampaigns(25, async () => {}), processMoverOutreachCampaigns(25, async () => {})]);
    assert.equal(accepted.length, before + 1);
    assert.equal(await prisma.outreachMessage.count({ where: { campaignId: scheduled.campaignId, sequence: 1 } }), 1);
    await processMoverOutreachCampaigns(25, async () => {});
    assert.equal(accepted.length, before + 1);
  });

  await t.test("initial alternatives share one Day 0 and customer permission, freshness and changed summaries are rechecked", async () => {
    const mover = await company();
    const general = await locked(tx => prepareDraft(tx, actor, mover.id));
    const quote = await prisma.quoteRequest.create({ data: { name: "Never shared customer", email: "private-customer@validation.invalid", phone: "0219999999", fromAddress: "21 Private Street", toAddress: "9 Private Lane", fromCity: "Auckland", toCity: "Hamilton", fromRegion: "Auckland", toRegion: "Waikato", fromPostcode: "1010", toPostcode: "3200", fromCountry: "NZ", toCountry: "NZ", fromPropertyType: "House", toPropertyType: "House", bedrooms: "3", moveDate: new Date(Date.now() + 14 * 86400000) } });
    await assert.rejects(locked(tx => prepareDraft(tx, actor, mover.id, quote.id)), /authorised, current/);
    await prisma.quoteRequest.update({ where: { id: quote.id }, data: { recruitmentSharingAllowed: true, sharingConsentAt: new Date() } });
    const specific = await locked(tx => prepareDraft(tx, actor, mover.id, quote.id));
    assert.equal(specific.id, general.id); assert.equal(specific.templateKey, "MOVER_OPPORTUNITY");
    assert.doesNotMatch(specific.text + specific.html, /Never shared customer|private-customer|0219999999|21 Private Street|9 Private Lane/);
    await prisma.quoteRequest.update({ where: { id: quote.id }, data: { toRegion: "Otago" } });
    await assert.rejects(send(specific), /details changed/);
    const refreshed = await locked(tx => editDraft(tx, actor, { id: specific.id, updatedAt: specific.updatedAt.toISOString(), introduction: "" }));
    assert.match(refreshed.text, /Moving to: Otago/);
    await prisma.quoteRequest.update({ where: { id: quote.id }, data: { moveDate: new Date("2020-01-01") } });
    await assert.rejects(send(refreshed), /no longer current/);
    const replacement = await locked(tx => prepareDraft(tx, actor, mover.id));
    assert.equal(replacement.id, general.id); assert.equal(replacement.templateKey, "MOVER_GENERAL");
    assert.equal(await prisma.outreachMessage.count({ where: { campaignId: general.campaignId, sequence: 0 } }), 1);
  });

  await t.test("explicit no-contact replies permanently suppress and temporary provider retries stop at three attempts", async () => {
    const optedOut = await makeSent();
    await locked(tx => recordOutreachReply(tx, optedOut.prospect.id, new Date(), undefined, true));
    assert.ok(await prisma.contactSuppression.findUnique({ where: { email: optedOut.prospect.email! } }));
    const failed = await makeSent(); let pending = await dueStep(failed.campaignId, 1);
    mode = "TEMPORARY";
    for (let attempt = 1; attempt <= 3; attempt++) {
      await send(pending, true);
      pending = await prisma.outreachMessage.findUniqueOrThrow({ where: { id: pending.id } });
      if (attempt < 3) pending = await prisma.outreachMessage.update({ where: { id: pending.id }, data: { retryAt: new Date(Date.now() - 1000) } });
    }
    mode = "OK";
    assert.equal(pending.sendAttempts, 3); assert.equal(pending.status, "NEEDS_REVIEW");
    assert.equal((await campaign(failed.campaignId)).status, "PAUSED");
    await assert.rejects(send(pending, true), /needs review|paused/);
  });
});
