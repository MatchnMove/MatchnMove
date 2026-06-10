import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStoredMoverLogoKey } from "@/lib/mover-logo";
import { requireAuthenticatedMover } from "@/lib/mover-profile";
import { deletePrivateDocuments, isPrivateStorageConfigured } from "@/lib/private-storage";
import { revalidateAboutPage, revalidatePublicMovers, revalidatePublicSite } from "@/lib/public-cache";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { stripe } from "@/lib/stripe";
import { moverDeleteAccountSchema } from "@/lib/validators";
import { verifyPassword } from "@/lib/password";

const MOVER_EMAIL_KINDS = [
  "mover_verification",
  "mover_password_reset",
  "mover_sign_in_code",
  "mover_new_lead",
  "mover_lead_expiry_warning",
  "verification_expiry_warning",
  "verification_decision",
];

function isMissingStripeResource(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "resource_missing",
  );
}

export async function DELETE(req: NextRequest) {
  const mover = await requireAuthenticatedMover();
  if (!mover) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  if (
    !rateLimit(`mover-delete-account:${mover.userId}`, 5, 60 * 60_000).allowed ||
    !rateLimit(`mover-delete-account-ip:${ip}`, 10, 60 * 60_000).allowed
  ) {
    return NextResponse.json(
      { error: "Too many account deletion attempts. Please wait before trying again." },
      { status: 429 },
    );
  }

  const parsed = moverDeleteAccountSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid account deletion request." },
      { status: 400 },
    );
  }

  if (mover.user.role !== "MOVER") {
    return NextResponse.json({ error: "Admin accounts cannot be deleted from the mover dashboard." }, { status: 403 });
  }

  const expectedConfirmation = `DELETE ${mover.companyName}`;
  if (parsed.data.confirmation !== expectedConfirmation) {
    return NextResponse.json({ error: `Type "${expectedConfirmation}" exactly to continue.` }, { status: 400 });
  }

  const passwordMatches = await verifyPassword(parsed.data.currentPassword, mover.user.passwordHash);
  if (!passwordMatches) {
    return NextResponse.json({ error: "Your current password is incorrect." }, { status: 400 });
  }

  const initialStorageKeys = mover.documents
    .map((document) => document.storageKey)
    .filter((key): key is string => Boolean(key));
  const logoStorageKey = getStoredMoverLogoKey(mover.logoUrl);
  if (logoStorageKey) initialStorageKeys.push(logoStorageKey);

  if (initialStorageKeys.length && !isPrivateStorageConfigured()) {
    return NextResponse.json(
      { error: "Private account files cannot be removed right now. Please try again shortly." },
      { status: 503 },
    );
  }
  if (mover.stripeCustomerId && !stripe) {
    return NextResponse.json(
      { error: "Billing account cleanup is temporarily unavailable. Please try again shortly." },
      { status: 503 },
    );
  }

  const previousStatus = mover.status;
  const claim = await prisma.moverCompany.updateMany({
    where: {
      id: mover.id,
      status: { not: "DELETING" },
    },
    data: { status: "DELETING" },
  });
  if (claim.count !== 1) {
    return NextResponse.json(
      { error: "Account deletion is already in progress." },
      { status: 409 },
    );
  }

  try {
    const cleanupSnapshot = await prisma.moverCompany.findUnique({
      where: { id: mover.id },
      select: {
        stripeCustomerId: true,
        logoUrl: true,
        documents: {
          select: { storageKey: true },
        },
      },
    });
    if (!cleanupSnapshot) throw new Error("Mover account disappeared during deletion.");

    const outstandingPayments = await prisma.payment.count({
      where: {
        status: "PENDING",
        amount: { gt: 0 },
        lead: { moverCompanyId: mover.id },
      },
    });
    if (outstandingPayments > 0) {
      await prisma.moverCompany.update({
        where: { id: mover.id },
        data: { status: previousStatus },
      });
      return NextResponse.json(
        {
          error:
            "This account has unresolved billable lead charges. Contact billing support to settle them before deleting the account.",
        },
        { status: 409 },
      );
    }

    const storageKeys = cleanupSnapshot.documents
      .map((document) => document.storageKey)
      .filter((key): key is string => Boolean(key));
    const currentLogoStorageKey = getStoredMoverLogoKey(cleanupSnapshot.logoUrl);
    if (currentLogoStorageKey) storageKeys.push(currentLogoStorageKey);
    await deletePrivateDocuments(storageKeys);

    if (cleanupSnapshot.stripeCustomerId && stripe) {
      try {
        await stripe.customers.del(cleanupSnapshot.stripeCustomerId);
      } catch (error) {
        if (!isMissingStripeResource(error)) throw error;
      }
    }

    await prisma.$transaction(async (tx) => {
      const leadIds = (
        await tx.lead.findMany({
          where: { moverCompanyId: mover.id },
          select: { id: true },
        })
      ).map((lead) => lead.id);

      await tx.review.deleteMany({ where: { moverCompanyId: mover.id } });
      await tx.reviewSurveyInvite.deleteMany({ where: { moverCompanyId: mover.id } });
      await tx.payment.deleteMany({ where: { leadId: { in: leadIds } } });
      await tx.auditLog.deleteMany({ where: { leadId: { in: leadIds } } });
      await tx.lead.deleteMany({ where: { moverCompanyId: mover.id } });
      await tx.phoneVerificationCode.deleteMany({
        where: {
          OR: [{ moverCompanyId: mover.id }, { userId: mover.userId }],
        },
      });
      await tx.verificationAudit.deleteMany({ where: { moverCompanyId: mover.id } });
      await tx.moverDocument.deleteMany({ where: { moverCompanyId: mover.id } });
      await tx.authToken.deleteMany({ where: { userId: mover.userId } });
      await tx.emailDelivery.deleteMany({
        where: {
          recipient: mover.user.email,
          kind: { in: MOVER_EMAIL_KINDS },
        },
      });
      await tx.adminAuditLog.deleteMany({ where: { actorId: mover.userId } });
      await tx.moverCompany.delete({ where: { id: mover.id } });
      await tx.user.delete({ where: { id: mover.userId } });
    });
  } catch (error) {
    await prisma.moverCompany
      .updateMany({
        where: { id: mover.id },
        data: { status: previousStatus },
      })
      .catch(() => undefined);
    console.error("Mover account deletion failed", {
      moverCompanyId: mover.id,
      userId: mover.userId,
      error,
    });
    return NextResponse.json(
      { error: "We could not finish deleting the account. Please try again shortly or contact support." },
      { status: 503 },
    );
  }

  await clearSessionCookie().catch((error) => {
    console.error("Could not clear deleted mover session cookie", error);
  });
  try {
    revalidatePublicMovers();
    revalidateAboutPage();
    revalidatePublicSite();
  } catch (error) {
    console.error("Could not revalidate public data after mover deletion", error);
  }

  return NextResponse.json({ ok: true });
}
