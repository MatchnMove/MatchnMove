import assert from "node:assert/strict";
import test from "node:test";
import nodemailer from "nodemailer";
import type { OutreachMessage, Prisma } from "@prisma/client";
import { prisma } from "../lib/db";
import { prepareDraft, type Tx } from "../lib/recruitment";
import { approveAndSend, editDraft, verifyContactFrequency, verifySend } from "../lib/recruitment-outreach";

test("a company can receive different lead emails after its invitation while its sequence retains its schedule", async t => {
  const previousEnv = { ...process.env };
  Object.assign(process.env, { SMTP_HOST: "smtp.fixture.invalid", SMTP_PORT: "587", SMTP_USER: "fixture", SMTP_PASS: "fixture", EMAIL_SMTP_POOL: "false", RECRUITMENT_EMAIL_VERIFIED: "true" });
  t.after(() => {
    for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key];
    Object.assign(process.env, previousEnv);
  });
  const actor = { id: "owner", role: "OWNER", canSend: true, canViewLeads: true } as const;
  const nextFollowUpAt = new Date(Date.now() + 7 * 86400000);
  const prospect = { id: "prospect", assignedAdminId: actor.id, companyName: "Example Movers", email: "mover@example.invalid", businessType: "MOVING", status: "CONTACTED", consentBasis: "EXPRESS", consentEvidence: "Recorded permission", respondedAt: null as Date | null, registeredAt: null as Date | null, nextFollowUpAt };
  const campaign = { id: "campaign", status: "ACTIVE", nextDueAt: nextFollowUpAt };
  const quotes = new Map(["first", "second", "third"].map((id, index) => [id, {
    id, fromRegion: "Auckland", toRegion: ["Waikato", "Northland", "Otago"][index], moveDate: new Date(Date.now() + 14 * 86400000), dateFlexible: true, bedrooms: "3", fromPropertyType: "House", createdAt: new Date(),
    recruitmentSharingAllowed: true, sharingConsentAt: new Date(), name: `Client ${id}`, email: `client-${id}@example.invalid`, phone: `021999999${index}`, fromAddress: `${21 + index} Private Street`, fromCity: "Auckland", fromPostcode: "1010", toAddress: `${9 + index} Private Lane`, toCity: "Hamilton", toPostcode: "3200", movingWhat: "INTERNAL CUSTOMER NOTE",
  }]));
  const invitation = { id: "invitation", prospectId: prospect.id, campaignId: campaign.id, sequence: 0, status: "SENT", templateKey: "MOVER_GENERAL", quoteRequestId: null, approvedAt: new Date() } as OutreachMessage;
  const messages = new Map<string, OutreachMessage>([[invitation.id, invitation]]);
  const deliveries = new Map<string, { id: string; dedupeKey: string }>();
  const sent: Array<{ text: string; html: string; to: string; messageId: string }> = [];
  let suppressed = false;
  let clock = Date.now();

  const matchingMessages = (where: Prisma.OutreachMessageWhereInput) => [...messages.values()].reverse().filter(row =>
    (!where.prospectId || row.prospectId === where.prospectId) &&
    (!where.adminId || row.adminId === where.adminId) &&
    (!where.status || row.status === where.status) &&
    (where.sequence === undefined || row.sequence === where.sequence) &&
    (where.quoteRequestId === undefined || row.quoteRequestId === where.quoteRequestId) &&
    (!where.id || row.id !== (where.id as { not: string }).not) &&
    (!where.approvedAt || Boolean(row.approvedAt && row.approvedAt >= (where.approvedAt as { gte: Date }).gte)),
  );
  const tx = {
    $queryRaw: async () => [],
    user: { findUnique: async ({ where }: { where: { id?: string } }) => where.id ? { id: actor.id, role: "ADMIN", adminRole: "OWNER" } : null },
    moverProspect: {
      findFirst: async () => prospect,
      update: async ({ data }: { data: { nextFollowUpAt?: Date | null } }) => {
        assert.equal(data.nextFollowUpAt, undefined, "An independent lead email preserves the company's follow-up schedule");
        return prospect;
      },
    },
    contactSuppression: { findUnique: async () => suppressed ? { email: prospect.email } : null },
    outreachCampaign: { findFirst: async () => campaign },
    quoteRequest: {
      findFirst: async ({ where, select }: { where: { id: string; recruitmentSharingAllowed: boolean }; select: Record<string, boolean> }) => {
        assert.equal(where.recruitmentSharingAllowed, true);
        for (const field of ["name", "email", "phone", "fromAddress", "toAddress", "fromCity", "toCity", "fromPostcode", "toPostcode"]) assert.equal(select[field], true, field);
        assert.equal(select.movingWhat, undefined);
        const quote = quotes.get(where.id);
        return quote?.recruitmentSharingAllowed ? quote : null;
      },
    },
    outreachMessage: {
      findFirst: async ({ where }: { where: Prisma.OutreachMessageWhereInput }) => matchingMessages(where)[0] ?? null,
      count: async ({ where }: { where: Prisma.OutreachMessageWhereInput }) => matchingMessages(where).length,
      findUnique: async ({ where }: { where: { id: string } }) => {
        const message = messages.get(where.id);
        return message ? { ...message, quoteRequest: quotes.get(message.quoteRequestId!) } : null;
      },
      create: async ({ data }: { data: OutreachMessage }) => {
        const message = { ...data, id: `draft-${messages.size}`, sendAttempts: 0, updatedAt: new Date(++clock) };
        messages.set(message.id, message);
        return message;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<Omit<OutreachMessage, "sendAttempts">> & { sendAttempts?: { increment: number } } }) => {
        const prior = messages.get(where.id)!;
        const message = { ...prior, ...data, sendAttempts: prior.sendAttempts + (data.sendAttempts?.increment ?? 0), updatedAt: new Date(++clock) };
        messages.set(message.id, message);
        return message;
      },
    },
    emailDelivery: {
      upsert: async ({ create }: { create: { dedupeKey: string } }) => {
        const delivery = { ...create, id: `delivery-${deliveries.size}` };
        deliveries.set(delivery.id, delivery);
        return delivery;
      },
      update: async () => ({}),
    },
    recruitmentSetting: { findUnique: async () => ({ value: { sendingEnabled: true, senderIdentity: "Match 'n Move", autoTasks: true } }) },
    recruitmentActivity: { create: async () => ({}) },
  } as unknown as Tx;
  // Exercise the production prepare, edit, approval and transport entry points
  // with an isolated transaction fixture and a captured SMTP transport.
  t.mock.method(prisma, "$transaction", async (callback: (tx: Tx) => Promise<unknown>) => callback(tx));
  t.mock.method(nodemailer, "createTransport", () => ({
    sendMail: async (mail: typeof sent[number]) => { sent.push(mail); return { messageId: mail.messageId, accepted: [mail.to], rejected: [] }; },
  }));
  const send = (draft: OutreachMessage) => approveAndSend(actor, { id: draft.id, updatedAt: draft.updatedAt.toISOString(), confirmed: true });

  let first = await prepareDraft(tx, actor, prospect.id, "first");
  const second = await prepareDraft(tx, actor, prospect.id, "second");
  assert.notEqual(first.id, second.id);
  assert.equal(first.campaignId, null);
  assert.equal(second.campaignId, null);
  assert.equal(messages.get(invitation.id), invitation);
  assert.equal((await prepareDraft(tx, actor, prospect.id, "first")).id, first.id);
  assert.match(first.text, /Moving to: Waikato/);
  assert.match(second.text, /Moving to: Northland/);
  messages.set(first.id, { ...first, introduction: "Keep this personal note.", templateVersion: "2026-11-03.v2", text: "Old summary", html: "<p>Old summary</p>" });
  first = await prepareDraft(tx, actor, prospect.id, "first");
  assert.equal(first.introduction, "Keep this personal note.");
  assert.match(first.text, /Client phone: 0219999990/);
  assert.match(first.text, /Pickup address: 21 Private Street, Auckland, 1010/);
  await verifyContactFrequency(tx, first);
  await assert.rejects(verifyContactFrequency(tx, { ...first, campaignId: campaign.id, templateKey: "MOVER_FOLLOWUP_1", quoteRequestId: null }), /last 24 hours/);

  const edited = await editDraft(tx, actor, { id: first.id, updatedAt: first.updatedAt.toISOString(), introduction: "A new move in your service area." });
  assert.match(edited.text, /A new move in your service area/);
  assert.match(edited.text, /Moving to: Waikato/);
  assert.match(edited.html, /Property size:<\/strong> 3 \/ House/);
  assert.equal((await send(edited)).ok, true);
  assert.equal((await send(second)).ok, true);
  assert.equal(sent.length, 2);
  assert.match(sent[0].text, /Moving to: Waikato/);
  assert.match(sent[1].text, /Moving to: Northland/);
  for (const [index, id] of ["first", "second"].entries()) {
    const client = quotes.get(id)!;
    for (const field of ["name", "email", "phone", "fromAddress", "toAddress"] as const) {
      assert.ok(sent[index].text.includes(client[field]), field);
      assert.ok(sent[index].html.includes(client[field]), field);
    }
    assert.doesNotMatch(sent[index].text + sent[index].html, /INTERNAL CUSTOMER NOTE/);
  }
  assert.doesNotMatch(sent[0].text, /client-second@example/);
  assert.doesNotMatch(sent[1].text, /client-first@example/);
  assert.equal(prospect.nextFollowUpAt, campaign.nextDueAt);
  await assert.rejects(prepareDraft(tx, actor, prospect.id, "first"), /already has an email sent/);
  await assert.rejects(send(edited), /sending was already attempted/);
  assert.equal(sent.length, 2);

  prospect.respondedAt = new Date();
  const third = await prepareDraft(tx, actor, prospect.id, "third");
  quotes.get("third")!.phone = "0211234567";
  await assert.rejects(send(third), /details changed/);
  const refreshed = await editDraft(tx, actor, { id: third.id, updatedAt: third.updatedAt.toISOString(), introduction: "" });
  assert.equal((await send(refreshed)).ok, true);
  assert.equal(sent.length, 3);
  quotes.get("third")!.recruitmentSharingAllowed = false;
  await assert.rejects(verifySend(tx, actor, third.id), /permission.*no longer available/);
  quotes.get("third")!.recruitmentSharingAllowed = true;
  quotes.get("third")!.moveDate = new Date("2020-01-01");
  await assert.rejects(verifySend(tx, actor, third.id), /no longer current/);
  suppressed = true;
  await assert.rejects(prepareDraft(tx, actor, prospect.id, "second"), /suppressed/);
  suppressed = false;
  prospect.registeredAt = new Date();
  await assert.rejects(prepareDraft(tx, actor, prospect.id, "second"), /started registration/);
});

test("a company's first opportunity can still start its initial invitation sequence", async () => {
  const actor = { id: "owner", role: "OWNER", canSend: true, canViewLeads: true } as const;
  const prospect = { id: "prospect", companyName: "New Movers", email: "mover@example.invalid", businessType: "MOVING", consentBasis: "EXPRESS", consentEvidence: "Recorded permission", status: "NOT_CONTACTED" };
  const quote = { id: "quote", fromRegion: "Auckland", toRegion: "Waikato", moveDate: new Date(Date.now() + 7 * 86400000), dateFlexible: false, bedrooms: "3", fromPropertyType: "House", createdAt: new Date() };
  let campaigns = 0;
  const tx = {
    user: { findUnique: async ({ where }: { where: { id?: string } }) => where.id ? { id: actor.id, role: "ADMIN", adminRole: "OWNER" } : null },
    moverProspect: { findFirst: async () => prospect },
    contactSuppression: { findUnique: async () => null },
    quoteRequest: { findFirst: async () => quote },
    outreachCampaign: {
      findFirst: async () => null,
      create: async () => { campaigns++; return { id: "campaign", status: "DRAFT" }; },
    },
    outreachMessage: { count: async () => 0, findFirst: async () => null, create: async ({ data }: { data: OutreachMessage }) => ({ ...data, id: "draft" }) },
    recruitmentActivity: { create: async () => ({}) },
  } as unknown as Tx;
  const draft = await prepareDraft(tx, actor, prospect.id, quote.id);
  assert.equal(draft.campaignId, "campaign");
  assert.equal(draft.sequence, 0);
  assert.equal(draft.templateKey, "MOVER_OPPORTUNITY");
  assert.equal(campaigns, 1);
});
