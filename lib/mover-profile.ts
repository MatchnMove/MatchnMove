import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
  yearsOperating: number | null;
  logoUrl: string | null;
  serviceAreas: string[];
  documents: Array<{ id: string }>;
  user: { emailVerifiedAt: Date | null };
}): MoverProfileReadiness {
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
      complete: hasText(mover.nzbn) && mover.yearsOperating !== null,
      label: hasText(mover.nzbn) && mover.yearsOperating !== null ? "Ready" : "Add NZBN",
      title: "Verify business identity",
      description: "Add your NZBN and years operating so the business profile can be checked.",
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
      complete: mover.documents.length > 0,
      label: mover.documents.length ? `${mover.documents.length} on file` : "Upload docs",
      title: "Upload verification documents",
      description: "Upload proof such as insurance, NZBN proof, or transport/business documentation.",
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
