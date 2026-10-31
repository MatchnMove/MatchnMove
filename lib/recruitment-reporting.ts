import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { RecruitmentActor, scopeProspects } from "@/lib/recruitment-policy";
import { fail } from "@/lib/recruitment";

export function reportingRange(start: string | null, end: string | null) {
  if (!start && !end) return {};
  const from = start ? new Date(start) : new Date(0);
  const to = end ? new Date(end) : new Date();
  if (
    !Number.isFinite(from.getTime()) ||
    !Number.isFinite(to.getTime()) ||
    from > to
  )
    fail("Choose a valid date range.");
  return { gte: from, lte: to };
}
export async function recruitmentMetrics(
  actor: RecruitmentActor,
  range: Prisma.DateTimeFilter = {},
) {
  const scope = scopeProspects(actor);
  const credit = actor.role === "OWNER" ? {} : { recruitedById: actor.id };
  const messageScope = actor.role === "OWNER" ? {} : { adminId: actor.id };
  const [
    assigned,
    uncontacted,
    contacted,
    invitationsSent,
    responses,
    interested,
    registered,
    activated,
    firstPaid,
    due,
    completed,
    cohortRegistered,
    cohortActivated,
    cohortInvitations,
    leads,
    invitedLeads,
  ] = await Promise.all([
    prisma.moverProspect.count({ where: scope }),
    prisma.moverProspect.count({
      where: { ...scope, status: "NOT_CONTACTED" },
    }),
    prisma.moverProspect.count({
      where: {
        ...scope,
        messages: {
          some: { ...messageScope, sentAt: { not: null, ...range } },
        },
      },
    }),
    prisma.outreachMessage.count({
      where: { ...messageScope, sentAt: { not: null, ...range } },
    }),
    prisma.moverProspect.count({
      where: { ...scope, respondedAt: { not: null, ...range } },
    }),
    prisma.moverProspect.count({
      where: { ...scope, interestedAt: { not: null, ...range } },
    }),
    prisma.moverProspect.count({
      where: { ...credit, registeredAt: { not: null, ...range } },
    }),
    prisma.moverProspect.count({
      where: { ...credit, activatedAt: { not: null, ...range } },
    }),
    prisma.moverProspect.count({
      where: { ...credit, firstPaidLeadAt: { not: null, ...range } },
    }),
    prisma.recruitmentTask.count({
      where: {
        conversationId: null,
        ...(actor.role === "OWNER" ? {} : { assignedAdminId: actor.id }),
        completedAt: null,
        cancelledAt: null,
        dueAt: { lte: new Date() },
      },
    }),
    prisma.recruitmentTask.count({
      where: {
        conversationId: null,
        ...(actor.role === "OWNER" ? {} : { assignedAdminId: actor.id }),
        completedAt: { not: null, ...range },
        cancelledAt: null,
      },
    }),
    prisma.outreachMessage.count({
      where: {
        ...messageScope,
        sentAt: { not: null, ...range },
        attributionConsumedAt: { not: null },
        prospect: { registeredAt: { not: null } },
      },
    }),
    prisma.outreachMessage.count({
      where: {
        ...messageScope,
        sentAt: { not: null, ...range },
        attributionConsumedAt: { not: null },
        prospect: { activatedAt: { not: null } },
      },
    }),
    prisma.outreachMessage.count({
      where: { ...messageScope, sentAt: { not: null, ...range } },
    }),
    prisma.quoteRequest.count({
      where: {
        recruitmentSharingAllowed: true,
        sharingConsentAt: { not: null },
        createdAt: range,
      },
    }),
    prisma.quoteRequest.count({
      where: {
        recruitmentSharingAllowed: true,
        createdAt: range,
        outreachMessages: { some: { ...messageScope, sentAt: { not: null } } },
      },
    }),
  ]);
  const percent = (value: number, denominator: number) =>
    denominator ? Math.round((value / denominator) * 1000) / 10 : 0;
  return {
    assigned,
    uncontacted,
    contacted,
    invitationsSent,
    responses,
    interested,
    registered,
    activated,
    firstPaid,
    followUpsDue: due,
    tasksCompleted: completed,
    invitationConversion: percent(cohortRegistered, cohortInvitations),
    activationConversion: percent(cohortActivated, cohortRegistered),
    leadInvitationConversion: percent(invitedLeads, leads),
    cohortInvitations,
    cohortRegistered,
    cohortActivated,
  };
}
