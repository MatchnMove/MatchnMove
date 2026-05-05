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

export function calculateMoverProfileReadiness(mover: {
  contactPerson: string | null;
  phone: string | null;
  nzbn: string | null;
  yearsOperating: number | null;
  logoUrl: string | null;
  serviceAreas: string[];
  documents: Array<{ id: string }>;
  user: { emailVerifiedAt: Date | null };
}) {
  const checks = [
    { key: "email", complete: Boolean(mover.user.emailVerifiedAt), label: mover.user.emailVerifiedAt ? "Verified" : "Needs action" },
    { key: "contact", complete: Boolean(mover.contactPerson && mover.phone), label: mover.contactPerson && mover.phone ? "Ready" : "Missing details" },
    { key: "business", complete: Boolean(mover.nzbn && mover.yearsOperating !== null), label: mover.nzbn && mover.yearsOperating !== null ? "Ready" : "Needs action" },
    { key: "serviceAreas", complete: mover.serviceAreas.length > 0, label: mover.serviceAreas.length ? `${mover.serviceAreas.length} selected` : "Add regions" },
    { key: "logo", complete: Boolean(mover.logoUrl), label: mover.logoUrl ? "Uploaded" : "Missing" },
    { key: "docs", complete: mover.documents.length > 0, label: mover.documents.length ? `${mover.documents.length} on file` : "0 on file" },
  ];

  const completion = Math.round((checks.filter((check) => check.complete).length / checks.length) * 100);
  return { completion, checks };
}
