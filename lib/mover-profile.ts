import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DOCUMENT_VERIFICATION, NZBN_VERIFICATION } from "@/lib/nzbn-verification";

const authenticatedMoverInclude = Prisma.validator<Prisma.MoverCompanyInclude>()({
  user: true,
  documents: {
    orderBy: { createdAt: "desc" },
  },
});

export async function requireAuthenticatedMover() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return prisma.moverCompany.findUnique({
    where: { userId: session.user.id },
    include: authenticatedMoverInclude,
  });
}

export type MoverReadinessDestination = "security" | "profile" | "documents";

export type MoverProfileReadinessCheck = {
  key: "email" | "contact" | "business" | "description" | "serviceAreas" | "logo" | "docs";
  complete: boolean;
  label: string;
  title: string;
  description: string;
  destination: MoverReadinessDestination;
};

export type MoverProfileReadiness = {
  completion: number;
  checks: MoverProfileReadinessCheck[];
  isLive: boolean;
  missingCount: number;
  nextStep: {
    key: MoverProfileReadinessCheck["key"];
    title: string;
    destination: MoverReadinessDestination;
    label: string;
  } | null;
};

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function calculateMoverProfileReadiness(mover: {
  businessDescription: string | null;
  contactPerson: string | null;
  phone: string | null;
  nzbn: string | null;
  nzbnVerificationStatus?: string | null;
  nzbnVerificationError?: string | null;
  yearsOperating: number | null;
  logoUrl: string | null;
  serviceAreas: string[];
  documents: Array<{ id: string; type?: string | null; verificationStatus?: string | null }>;
  user: { emailVerifiedAt: Date | null };
}): MoverProfileReadiness {
  const nzbnVerified = mover.nzbnVerificationStatus === NZBN_VERIFICATION.VERIFIED;
  const requiredDocumentTypes = ["INSURANCE", "NZBN_PROOF"] as const;
  const approvedDocumentTypes = new Set(
    mover.documents
      .filter((document) => document.verificationStatus === DOCUMENT_VERIFICATION.APPROVED)
      .map((document) => document.type)
      .filter((type): type is string => Boolean(type)),
  );
  const approvedRequiredDocumentCount = requiredDocumentTypes.filter((type) => approvedDocumentTypes.has(type)).length;
  const requiredDocumentsApproved = approvedRequiredDocumentCount === requiredDocumentTypes.length;

  const checks: MoverProfileReadinessCheck[] = [
    {
      key: "email",
      complete: Boolean(mover.user.emailVerifiedAt),
      label: mover.user.emailVerifiedAt ? "Verified" : "Verify email",
      title: "Verify email",
      description: "Confirm the account email so profile changes and account recovery are protected.",
      destination: "security",
    },
    {
      key: "contact",
      complete: hasText(mover.contactPerson) && hasText(mover.phone),
      label: hasText(mover.contactPerson) && hasText(mover.phone) ? "Ready" : "Add contact",
      title: "Add contact details",
      description: "Save a contact name and phone number customers and Match 'n Move can trust.",
      destination: "profile",
    },
    {
      key: "business",
      complete: hasText(mover.nzbn) && mover.yearsOperating !== null && nzbnVerified,
      label: nzbnVerified
        ? "NZBN verified"
        : mover.nzbnVerificationStatus === NZBN_VERIFICATION.PENDING_REVIEW
          ? "NZBN in review"
          : mover.nzbnVerificationStatus === NZBN_VERIFICATION.FAILED
            ? "NZBN failed"
            : "Verify NZBN",
      title: "Verify business identity",
      description: mover.nzbnVerificationError || "Add an NZBN that matches an active NZBN Register entity and your mover profile name.",
      destination: "profile",
    },
    {
      key: "description",
      complete: hasText(mover.businessDescription),
      label: hasText(mover.businessDescription) ? "Ready" : "Add summary",
      title: "Write public profile",
      description: "Add a public business description so customers can understand who they are choosing.",
      destination: "profile",
    },
    {
      key: "serviceAreas",
      complete: mover.serviceAreas.length > 0,
      label: mover.serviceAreas.length ? `${mover.serviceAreas.length} selected` : "Add regions",
      title: "Choose service areas",
      description: "Select the NZ regions your team actively covers so leads are matched correctly.",
      destination: "profile",
    },
    {
      key: "logo",
      complete: hasText(mover.logoUrl),
      label: mover.logoUrl ? "Uploaded" : "Upload logo",
      title: "Upload company logo",
      description: "Add a logo so the public profile looks legitimate and easy to recognise.",
      destination: "profile",
    },
    {
      key: "docs",
      complete: requiredDocumentsApproved,
      label: requiredDocumentsApproved ? "Approved" : `${approvedRequiredDocumentCount}/${requiredDocumentTypes.length} approved`,
      title: "Upload verification documents",
      description: "Upload insurance and NZBN proof. They must be reviewed and approved before the profile can go live.",
      destination: "documents",
    },
  ];

  const missingChecks = checks.filter((check) => !check.complete);
  const completion = Math.round((checks.filter((check) => check.complete).length / checks.length) * 100);
  const nextStep = missingChecks[0]
    ? {
        key: missingChecks[0].key,
        title: missingChecks[0].title,
        destination: missingChecks[0].destination,
        label: missingChecks[0].label,
      }
    : null;

  return {
    completion,
    checks,
    isLive: missingChecks.length === 0,
    missingCount: missingChecks.length,
    nextStep,
  };
}

export function isMoverProfileLive(mover: Parameters<typeof calculateMoverProfileReadiness>[0]) {
  return calculateMoverProfileReadiness(mover).isLive;
}
