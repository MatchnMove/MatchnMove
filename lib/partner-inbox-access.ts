import { prisma } from "@/lib/db";
import { checkActor, fail, recruitmentActor, type Tx } from "@/lib/recruitment";
import type { RecruitmentActor } from "@/lib/recruitment-policy";

export type InboxActor = RecruitmentActor & { canInboxSend: boolean };
export async function inboxActor(send = false): Promise<InboxActor> {
  const actor = await recruitmentActor();
  return prisma.$transaction(async (tx) => checkInboxActor(tx, actor, send));
}
export async function checkInboxActor(
  tx: Tx,
  actor: RecruitmentActor,
  send = false,
): Promise<InboxActor> {
  const user = await checkActor(tx, actor);
  const owner = actor.role === "OWNER";
  if (!owner && !user.canAccessPartnerInbox)
    fail("Inbox access has not been granted by an owner.", 403);
  const canInboxSend = owner || user.canSendPartnerInbox;
  if (send && !canInboxSend) fail("Inbox sending permission is required.", 403);
  return {
    ...actor,
    canSend: owner || user.canSendRecruitment,
    canViewLeads: owner || user.canViewRecruitmentLeads,
    canInboxSend,
  };
}
export function inboxScope(actor: RecruitmentActor) {
  return {
    onboardingTracked: true,
    ...(actor.role === "OWNER" ? {} : { assignedAdminId: actor.id }),
  };
}
export async function inboxConversation(
  tx: Tx,
  actor: RecruitmentActor,
  id: string,
) {
  const row = await tx.partnerConversation.findFirst({
    where: { id, ...inboxScope(actor) },
  });
  if (!row) fail("Conversation not found.", 404);
  return row;
}
export async function inboxActivity(
  tx: Tx,
  conversationId: string,
  actorId: string | null,
  action: string,
) {
  return tx.partnerInboxActivity.create({
    data: { conversationId, actorId, action },
  });
}
