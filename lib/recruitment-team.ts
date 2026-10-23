import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { auth } from "@/lib/auth";
import {
  RecruitmentActor,
  normalizeEmail,
  secureToken,
  tokenHash,
  escapeHtml,
} from "@/lib/recruitment-policy";
import {
  Tx,
  audit,
  baseUrl,
  fail,
  locked,
  ownerOnly,
  emailReady,
  checkActor,
} from "@/lib/recruitment";
import { sendAdminInvitationEmail } from "@/lib/email";

export const teamInviteSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254).transform(normalizeEmail),
  role: z.enum(["OWNER", "RECRUITMENT_ADMIN"]).default("RECRUITMENT_ADMIN"),
});
export async function createTeamInvitation(
  tx: Tx,
  actor: RecruitmentActor,
  raw: unknown,
) {
  ownerOnly(actor);
  const data = teamInviteSchema.parse(raw);
  const existing = await tx.user.findFirst({
    where: { email: { equals: data.email, mode: "insensitive" } },
  });
  if (existing?.adminRole)
    fail("This account already has a team role. Use Team Management.", 409);
  const invitation = await tx.adminInvitation.upsert({
    where: { email: data.email },
    update: {
      ...data,
      invitedById: actor.id,
      acceptedAt: null,
      revokedAt: null,
      tokenHash: null,
      expiresAt: null,
      sentAt: null,
    },
    create: { ...data, invitedById: actor.id },
  });
  await audit(tx, actor.id, "team_invitation_prepared", {
    invitationId: invitation.id,
    email: data.email,
    role: data.role,
  });
  return invitation;
}
export async function dispatchTeamInvitation(
  actor: RecruitmentActor,
  id: string,
) {
  ownerOnly(actor);
  if (!emailReady())
    fail(
      "Verify the SMTP sender and set RECRUITMENT_EMAIL_VERIFIED before sending team invitations.",
      503,
    );
  const token = secureToken();
  const invitation = await locked(async (tx) => {
    await checkActor(tx, actor);
    const row = await tx.adminInvitation.findUnique({ where: { id } });
    if (!row || row.acceptedAt || row.revokedAt)
      fail("Invitation is unavailable.", 409);
    if (row.sentAt && Date.now() - row.sentAt.getTime() < 600000)
      fail("Wait ten minutes before issuing a replacement invitation.", 429);
    const updated = await tx.adminInvitation.update({
      where: { id },
      data: {
        tokenHash: tokenHash(token),
        expiresAt: new Date(Date.now() + 48 * 3600000),
        sentAt: new Date(),
        invitedById: actor.id,
      },
    });
    await audit(tx, actor.id, "team_invitation_dispatched", {
      invitationId: id,
    });
    return updated;
  });
  const url = `${baseUrl()}/admin/accept-invitation?token=${token}`;
  return sendAdminInvitationEmail({
    email: invitation.email,
    text: `Hi ${invitation.name},\n\nYou are invited to join Match 'n Move as ${invitation.role}. Set up your own secure account:\n${url}\n\nThis single-use link expires in 48 hours. Existing account holders must sign in to verify ownership.`,
    html: `<p>Hi ${escapeHtml(invitation.name)},</p><p>You are invited to the Match 'n Move team.</p><p><a href="${escapeHtml(url)}">Set up your secure account</a></p><p>This single-use link expires in 48 hours. Existing account holders must sign in first.</p>`,
  });
}

export async function acceptTeamInvitation(raw: unknown) {
  const input = z
    .object({
      token: z.string().min(32).max(200),
      password: z.string().min(12).max(128).optional(),
    })
    .parse(raw);
  const session = await auth();
  const passwordHash = input.password
    ? await hashPassword(input.password)
    : null;
  return locked((tx) =>
    activateTeamInvitation(tx, input.token, passwordHash, session?.user.id),
  );
}

export async function activateTeamInvitation(
  tx: Tx,
  token: string,
  passwordHash: string | null,
  authenticatedUserId?: string,
) {
  const invitation = await tx.adminInvitation.findUnique({
    where: { tokenHash: tokenHash(token) },
  });
  if (
    !invitation ||
    invitation.acceptedAt ||
    invitation.revokedAt ||
    !invitation.expiresAt ||
    invitation.expiresAt < new Date()
  )
    fail("This invitation is invalid or expired.");
  const existing = await tx.user.findFirst({
    where: { email: { equals: invitation.email, mode: "insensitive" } },
  });
  if (
    existing &&
    (authenticatedUserId !== existing.id || !existing.emailVerifiedAt)
  )
    fail(
      "Sign in to your existing verified account first, then reopen this invitation. Your current password and account data are preserved.",
      409,
    );
  if (existing?.adminDisabledAt || existing?.adminRole)
    fail("The owner must review this existing team account.", 409);
  if (!existing && !passwordHash)
    fail("Choose a password of at least 12 characters.");
  const user = existing
    ? await tx.user.update({
        where: { id: existing.id },
        data: {
          adminRole: invitation.role,
          sessionVersion: { increment: 1 },
          canViewRecruitmentLeads: true,
        },
      })
    : await tx.user.create({
        data: {
          name: invitation.name,
          email: invitation.email,
          passwordHash: passwordHash!,
          emailVerifiedAt: new Date(),
          role: "ADMIN",
          adminRole: invitation.role,
          canViewRecruitmentLeads: true,
        },
      });
  await tx.adminInvitation.update({
    where: { id: invitation.id },
    data: { acceptedAt: new Date(), tokenHash: null },
  });
  await audit(tx, user.id, "team_invitation_accepted", {
    invitationId: invitation.id,
    role: invitation.role,
  });
  return { ok: true };
}

export async function updateTeamUser(
  tx: Tx,
  actor: RecruitmentActor,
  raw: unknown,
) {
  ownerOnly(actor);
  const input = z
    .object({
      id: z.string(),
      role: z.enum(["OWNER", "RECRUITMENT_ADMIN"]),
      disabled: z.boolean(),
      canSend: z.boolean(),
      canViewLeads: z.boolean(),
    })
    .parse(raw);
  if (input.id === actor.id)
    fail("You cannot change your own permissions or disable yourself.");
  const user = await tx.user.findUnique({ where: { id: input.id } });
  if (!user || (!user.adminRole && user.role !== "ADMIN"))
    fail("Team member not found.", 404);
  await tx.user.update({
    where: { id: input.id },
    data: {
      adminRole: input.role,
      adminDisabledAt: input.disabled ? new Date() : null,
      canSendRecruitment: input.canSend,
      canViewRecruitmentLeads: input.canViewLeads,
      sessionVersion: { increment: 1 },
    },
  });
  await tx.authToken.deleteMany({
    where: { userId: input.id, consumedAt: null },
  });
  await audit(tx, actor.id, "team_permissions_changed", {
    userId: input.id,
    previousRole: user.adminRole || "LEGACY_ADMIN",
    ...input,
  });
}

export const teamSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  adminRole: true,
  adminDisabledAt: true,
  lastSignInAt: true,
  canSendRecruitment: true,
  canViewRecruitmentLeads: true,
  _count: { select: { assignedProspects: true, recruitmentTasks: true } },
} as const;
export async function teamList() {
  return prisma.user.findMany({
    where: { OR: [{ adminRole: { not: null } }, { role: "ADMIN" }] },
    select: teamSelect,
    orderBy: { createdAt: "asc" },
  });
}
