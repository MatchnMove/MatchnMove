import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { sendVerificationReviewSubmitted } from "@/lib/email";
import { calculateMoverProfileReadiness, isPhoneVerificationRequired, requireAuthenticatedMover } from "@/lib/mover-profile";
import { NZBN_VERIFICATION, verifyNzbnAgainstRegister } from "@/lib/nzbn-verification";
import { revalidateAboutPage, revalidatePublicMovers } from "@/lib/public-cache";
import { moverProfileSchema, sanitiseServiceAreas } from "@/lib/validators";

function serialiseProfile(mover: NonNullable<Awaited<ReturnType<typeof requireAuthenticatedMover>>>) {
  const readiness = calculateMoverProfileReadiness(mover);

  return {
    companyName: mover.companyName,
    businessDescription: mover.businessDescription ?? "",
    contactPerson: mover.contactPerson ?? "",
    phone: mover.phone ?? "",
    phoneVerifiedAt: mover.phoneVerifiedAt?.toISOString() ?? null,
    phoneVerificationRequired: isPhoneVerificationRequired(),
    authorizedRepresentativeName: mover.authorizedRepresentativeName ?? "",
    authorizedRepresentativeRole: mover.authorizedRepresentativeRole ?? "",
    authorityDeclaredAt: mover.authorityDeclaredAt?.toISOString() ?? null,
    nzbn: mover.nzbn ?? "",
    nzbnVerificationStatus: mover.nzbnVerificationStatus,
    nzbnRegisteredName: mover.nzbnRegisteredName,
    nzbnEntityStatus: mover.nzbnEntityStatus,
    nzbnVerifiedAt: mover.nzbnVerifiedAt?.toISOString() ?? null,
    nzbnVerificationError: mover.nzbnVerificationError,
    yearsOperating: mover.yearsOperating ?? null,
    serviceAreas: sanitiseServiceAreas(mover.serviceAreas),
    email: mover.user.email,
    emailVerified: Boolean(mover.user.emailVerifiedAt),
    logoUrl: mover.logoUrl,
    documents: mover.documents.map((document) => ({
      id: document.id,
      type: document.type,
      fileName: document.fileName ?? "Document",
      mimeType: document.mimeType ?? null,
      fileSize: document.fileSize ?? null,
      verificationStatus: document.verificationStatus,
      verificationNote: document.verificationNote,
      reviewedAt: document.reviewedAt?.toISOString() ?? null,
      reviewedBy: document.reviewedBy,
      expiresAt: document.expiresAt?.toISOString() ?? null,
      scanStatus: document.scanStatus,
      detectedMimeType: document.detectedMimeType,
      viewUrl: `/api/mover/profile/documents/${document.id}/file`,
      createdAt: document.createdAt.toISOString(),
    })),
    readiness,
  };
}

export async function GET() {
  const mover = await requireAuthenticatedMover();
  if (!mover) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(serialiseProfile(mover));
}

export async function PATCH(req: NextRequest) {
  const mover = await requireAuthenticatedMover();
  if (!mover) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit(`mover-profile:${mover.id}`, 20, 60_000).allowed) {
    return NextResponse.json({ error: "Too many profile update attempts. Please try again shortly." }, { status: 429 });
  }

  const parsed = moverProfileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid profile details" }, { status: 400 });
  }

  const serviceAreas = sanitiseServiceAreas(parsed.data.serviceAreas);
  const nzbnChanged = (mover.nzbn ?? null) !== parsed.data.nzbn;
  const phoneChanged = mover.phone !== parsed.data.phone;
  const authorityComplete = Boolean(
    parsed.data.authorizedRepresentativeName &&
      parsed.data.authorizedRepresentativeRole &&
      parsed.data.authorityConfirmed,
  );
  const authorityChanged =
    mover.authorizedRepresentativeName !== parsed.data.authorizedRepresentativeName ||
    mover.authorizedRepresentativeRole !== parsed.data.authorizedRepresentativeRole ||
    Boolean(mover.authorityDeclaredAt) !== authorityComplete;
  let nzbnVerificationData = {};

  if (!parsed.data.nzbn) {
    nzbnVerificationData = {
      nzbnVerificationStatus: NZBN_VERIFICATION.UNVERIFIED,
      nzbnVerifiedAt: null,
      nzbnRegisteredName: null,
      nzbnEntityStatus: null,
      nzbnVerificationSource: null,
      nzbnVerificationError: null,
    };
  } else if (nzbnChanged || mover.nzbnVerificationStatus !== NZBN_VERIFICATION.VERIFIED) {
    const nzbnVerification = await verifyNzbnAgainstRegister(parsed.data.nzbn, mover.companyName);

    if (nzbnVerification.status === NZBN_VERIFICATION.FAILED) {
      return NextResponse.json({ error: nzbnVerification.error ?? "NZBN could not be verified." }, { status: 400 });
    }

    nzbnVerificationData = {
      nzbnVerificationStatus: nzbnVerification.status,
      nzbnVerifiedAt: nzbnVerification.verifiedAt,
      nzbnRegisteredName: nzbnVerification.registeredName,
      nzbnEntityStatus: nzbnVerification.entityStatus,
      nzbnVerificationSource: nzbnVerification.source,
      nzbnVerificationError: nzbnVerification.error,
    };
  }

  const publicFieldsChanged =
    mover.contactPerson !== parsed.data.contactPerson ||
    mover.phone !== parsed.data.phone ||
    nzbnChanged ||
    authorityChanged ||
    Object.keys(nzbnVerificationData).length > 0 ||
    mover.businessDescription !== parsed.data.businessDescription ||
    mover.yearsOperating !== parsed.data.yearsOperating ||
    mover.serviceAreas.length !== serviceAreas.length ||
    mover.serviceAreas.some((area, index) => area !== serviceAreas[index]);

  const updatedMover = await prisma.moverCompany.update({
    where: { id: mover.id },
    data: {
      contactPerson: parsed.data.contactPerson,
      phone: parsed.data.phone,
      phoneVerifiedAt: phoneChanged ? null : mover.phoneVerifiedAt,
      authorizedRepresentativeName: parsed.data.authorizedRepresentativeName,
      authorizedRepresentativeRole: parsed.data.authorizedRepresentativeRole,
      authorityDeclaredAt: authorityComplete
        ? authorityChanged
          ? new Date()
          : mover.authorityDeclaredAt
        : null,
      nzbn: parsed.data.nzbn,
      yearsOperating: parsed.data.yearsOperating,
      serviceAreas,
      businessDescription: parsed.data.businessDescription,
      ...nzbnVerificationData,
    },
    include: {
      user: true,
      documents: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (nzbnChanged || Object.keys(nzbnVerificationData).length > 0) {
    await prisma.verificationAudit.create({
      data: {
        moverCompanyId: mover.id,
        actorId: mover.userId,
        actorType: "MOVER",
        action: "NZBN_SUBMITTED",
        previousStatus: mover.nzbnVerificationStatus,
        nextStatus: updatedMover.nzbnVerificationStatus,
        meta: {
          nzbn: updatedMover.nzbn,
          source: updatedMover.nzbnVerificationSource,
        },
      },
    });

    if (updatedMover.nzbnVerificationStatus === NZBN_VERIFICATION.PENDING_REVIEW) {
      await sendVerificationReviewSubmitted({
        moverCompanyName: updatedMover.companyName,
        moverEmail: updatedMover.user.email,
        item: "NZBN",
        detail: `NZBN ${updatedMover.nzbn || "not supplied"} requires manual review.`,
      }).catch((error) => console.error("Could not queue NZBN review email", error));
    }
  }

  if (publicFieldsChanged) {
    revalidatePublicMovers();
    revalidateAboutPage();
  }

  return NextResponse.json(serialiseProfile(updatedMover));
}
