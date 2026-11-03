import { z } from "zod";
import { activity, audit, cancelFollowUps, checkActor, fail, ownedProspect, type Tx } from "@/lib/recruitment";
import type { RecruitmentActor } from "@/lib/recruitment-policy";

// Tombstones retain delivery evidence and consent history. They also stop the
// Gmail worker from importing a removed draft back into the admin panel.
export async function discardOutreachDraft(tx: Tx, actor: RecruitmentActor, raw: unknown) {
  const input = z.object({ id: z.string(), updatedAt: z.string().datetime(), confirmed: z.literal(true) }).parse(raw);
  await checkActor(tx, actor);
  const draft = await tx.outreachMessage.findUnique({ where: { id: input.id }, include: { inboxMessage: true } });
  if (!draft) fail("Draft not found.", 404);
  await ownedProspect(tx, actor, draft.prospectId);
  if (!["DRAFT", "RETRY"].includes(draft.status) || draft.updatedAt.toISOString() !== input.updatedAt || draft.sentAt)
    fail("This draft changed or sending has been attempted. Reload before removing it.", 409);
  if (draft.inboxMessage && !["DRAFT", "PROVIDER_DRAFT", "DELETED"].includes(draft.inboxMessage.status))
    fail("This draft has an active or uncertain inbox delivery. Review it first.", 409);
  await tx.outreachMessage.update({ where: { id: draft.id }, data: { status: "DISCARDED", retryAt: null } });
  if (draft.inboxMessage) await tx.partnerMessage.update({ where: { id: draft.inboxMessage.id }, data: { status: "DELETED", draftDirty: true, version: { increment: 1 } } });
  if (draft.campaignId && draft.sequence > 0) {
    await tx.outreachCampaign.update({ where: { id: draft.campaignId }, data: { status: "PAUSED", reason: "A follow-up draft was removed. Resume only when you are ready to prepare it again." } });
    await tx.moverProspect.update({ where: { id: draft.prospectId }, data: { nextFollowUpAt: null, version: { increment: 1 } } });
  }
  await tx.recruitmentTask.updateMany({ where: { dedupeKey: `follow-up:${draft.followUpToId || draft.id}`, completedAt: null }, data: { cancelledAt: new Date() } });
  await activity(tx, draft.prospectId, actor.id, "email_draft_removed", { messageId: draft.id });
  return { ok: true };
}

export async function removeDirectoryCompany(tx: Tx, actor: RecruitmentActor, raw: unknown) {
  const input = z.object({ id: z.string(), version: z.number().int(), confirmed: z.literal(true) }).parse(raw);
  await checkActor(tx, actor);
  const company = await ownedProspect(tx, actor, input.id);
  if (company.version !== input.version || company.removedAt) fail("This company changed. Reload before removing it.", 409);
  if (await tx.outreachMessage.count({ where: { prospectId: company.id, status: { in: ["SENDING", "NEEDS_REVIEW"] } } }) ||
      await tx.partnerMessage.count({ where: { conversation: { prospectId: company.id }, status: { in: ["SENDING", "NEEDS_REVIEW"] } } }))
    fail("Review the active or uncertain email delivery before removing this company.", 409);
  await tx.moverProspect.update({ where: { id: company.id }, data: { removedAt: new Date(), nextFollowUpAt: null, version: { increment: 1 } } });
  await cancelFollowUps(tx, company.id);
  await tx.outreachMessage.updateMany({ where: { prospectId: company.id, status: { in: ["DRAFT", "RETRY", "QUEUED"] } }, data: { status: "DISCARDED", retryAt: null } });
  await tx.partnerMessage.updateMany({ where: { conversation: { prospectId: company.id }, status: { in: ["DRAFT", "PROVIDER_DRAFT"] } }, data: { status: "DELETED", draftDirty: true, version: { increment: 1 } } });
  await activity(tx, company.id, actor.id, "company_removed_from_directory");
  await audit(tx, actor.id, "company_removed_from_directory", { prospectId: company.id });
  return { ok: true };
}

export async function restoreDirectoryCompany(tx: Tx, actor: RecruitmentActor, raw: unknown) {
  const input = z.object({ id: z.string(), version: z.number().int(), confirmed: z.literal(true) }).parse(raw);
  await checkActor(tx, actor);
  const company = await ownedProspect(tx, actor, input.id);
  if (!company.removedAt || company.version !== input.version) fail("This company changed. Reload before restoring it.", 409);
  await tx.moverProspect.update({ where: { id: company.id }, data: { removedAt: null, version: { increment: 1 } } });
  await activity(tx, company.id, actor.id, "company_restored_to_directory");
  // Restoring a directory entry never resumes its stopped outreach or tasks.
  return { ok: true };
}
