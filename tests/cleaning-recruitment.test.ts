import assert from "node:assert/strict";
import test from "node:test";
import { defaultCleaningIntroduction, renderRecruitmentEmail } from "../lib/recruitment-policy";
import { partnerRegistrationPath } from "../lib/partner-business";
import { prepareDraft, saveProspect, type Tx } from "../lib/recruitment";
import { claimRegistrationAttribution } from "../lib/recruitment-outreach";

const actor = { id: "admin", role: "OWNER" as const, canSend: true, canViewLeads: true };

test("cleaning invitations describe cleaning services and link to cleaner registration", () => {
  const result = renderRecruitmentEmail({ companyName: "Example Cleaners", businessType: "CLEANING", introduction: defaultCleaningIntroduction, lead: null,
    registrationUrl: "https://example.invalid/cleaner/register", unsubscribeUrl: "https://example.invalid/unsubscribe", sender: "Team" });
  assert.match(result.text, /move-out and move-in cleaning/);
  assert.match(result.text, /specific cleaning job/);
  assert.doesNotMatch(result.text, /moving companies|specific moving job|Moving date/);
  assert.equal(partnerRegistrationPath("CLEANING"), "/cleaner/register");
  assert.equal(partnerRegistrationPath("MOVING"), "/mover/login?mode=signup");
});

test("cleaning prospects cannot receive invitations containing a moving customer's request", async () => {
  const tx = { moverProspect: { findFirst: async () => ({ id: "cleaner", businessType: "CLEANING", assignedAdminId: actor.id }) } } as unknown as Tx;
  await assert.rejects(prepareDraft(tx, actor, "cleaner", "moving-lead"), /Prepare a general cleaning invitation instead/);
});

test("saving a cleaning company preserves its type and cleaning services and rejects moving services", async () => {
  const saved: Array<Record<string, unknown>> = [];
  const tx = {
    moverProspect: { findFirst: async () => null, create: async ({ data }: { data: Record<string, unknown> }) => { saved.push(data); return { id: "cleaner", ...data }; } },
    recruitmentActivity: { create: async () => ({}) }, adminAuditLog: { create: async () => ({}) },
    recruitmentTask: { updateMany: async () => ({ count: 0 }) },
  } as unknown as Tx;
  const input = { companyName: "Example Cleaners", businessType: "CLEANING", email: "cleaner@example.invalid", phone: "0211234567", emailAvailability: "PUBLIC", phoneAvailability: "PUBLIC", serviceTypes: ["MOVE_OUT_CLEANING"], longDistance: true };
  await saveProspect(tx, actor, input);
  assert.equal(saved[0].businessType, "CLEANING");
  assert.deepEqual(saved[0].serviceTypes, ["MOVE_OUT_CLEANING"]);
  assert.equal(saved[0].longDistance, false);
  await assert.rejects(saveProspect(tx, actor, { ...input, serviceTypes: ["HOUSEHOLD"] }), /match the company's business type/);
  await assert.rejects(saveProspect(tx, actor, { ...input, businessType: "MOVING" }), /match the company's business type/);
});

test("cleaner registration attribution links its cleaner account and inbox threads only for the invited email and business type", async () => {
  const prospect = { id: "prospect", email: "cleaner@example.invalid", assignedAdminId: "admin", businessType: "CLEANING", moverCompanyId: null, cleanerCompanyId: null };
  const updates: Array<{ model: string; data: Record<string, unknown> }> = [];
  const message = { id: "message", prospectId: prospect.id, adminId: "admin", prospect, status: "SENT", attributionConsumedAt: null, attributionExpiresAt: new Date(Date.now() + 86400000) };
  const tx = {
    $queryRaw: async () => [],
    outreachMessage: {
      findUnique: async () => message,
      update: async ({ data }: { data: Record<string, unknown> }) => { updates.push({ model: "message", data }); },
      updateMany: async () => ({}),
    },
    cleanerCompany: { findFirst: async ({ where }: { where: { id: string; userId: string } }) => where.id === "cleaner-company" && where.userId === "cleaner-user" ? { id: where.id } : null },
    moverProspect: { update: async ({ data }: { data: Record<string, unknown> }) => { updates.push({ model: "prospect", data }); } },
    partnerConversation: { updateMany: async ({ data }: { data: Record<string, unknown> }) => { updates.push({ model: "conversation", data }); } },
    recruitmentTask: { updateMany: async () => ({}) },
    outreachCampaign: { updateMany: async () => ({}) },
    recruitmentSetting: { findUnique: async () => ({ value: { autoTasks: false } }) },
    recruitmentActivity: { create: async () => ({}) },
  } as unknown as Tx;
  await claimRegistrationAttribution(tx, "token", "cleaner-user", "someone-else@example.invalid", "cleaner-company", "CLEANING");
  await claimRegistrationAttribution(tx, "token", "cleaner-user", prospect.email, "cleaner-company", "MOVING");
  await claimRegistrationAttribution(tx, "token", "wrong-user", prospect.email, "cleaner-company", "CLEANING");
  assert.equal(updates.length, 0);
  await claimRegistrationAttribution(tx, "token", "cleaner-user", prospect.email, "cleaner-company", "CLEANING");
  const saved = updates.find(update => update.model === "prospect")!.data;
  assert.equal(saved.cleanerCompanyId, "cleaner-company");
  assert.equal(saved.moverCompanyId, undefined);
  assert.equal(saved.status, "REGISTRATION_STARTED");
  assert.deepEqual(updates.find(update => update.model === "conversation")!.data, { cleanerCompanyId: "cleaner-company" });
});
