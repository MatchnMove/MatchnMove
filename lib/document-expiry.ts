import { prisma } from "@/lib/db";
import { sendVerificationDecision } from "@/lib/email";
import { revalidateAboutPage, revalidatePublicMovers } from "@/lib/public-cache";

function getDashboardUrl() {
  return `${process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "http://localhost:3000"}/mover/dashboard?tab=profile`;
}

export async function processDocumentExpiry(limit = 50) {
  const now = new Date();
  const reminderCutoff = new Date(now.getTime() + 30 * 24 * 60 * 60_000);
  const documents = await prisma.moverDocument.findMany({
    where: {
      type: "INSURANCE",
      verificationStatus: "APPROVED",
      expiresAt: { not: null, lte: reminderCutoff },
      expiryReminderSentAt: null,
    },
    include: {
      moverCompany: {
        include: { user: true },
      },
    },
    orderBy: { expiresAt: "asc" },
    take: limit,
  });

  let expired = 0;
  let reminded = 0;

  for (const document of documents) {
    const isExpired = Boolean(document.expiresAt && document.expiresAt <= now);
    const nextStatus = isExpired ? "EXPIRED" : document.verificationStatus;
    await prisma.$transaction([
      prisma.moverDocument.update({
        where: { id: document.id },
        data: {
          verificationStatus: nextStatus,
          expiryReminderSentAt: now,
          ...(isExpired
            ? {
                verificationNote: "This insurance document has expired. Upload current proof of cover.",
              }
            : {}),
        },
      }),
      prisma.verificationAudit.create({
        data: {
          moverCompanyId: document.moverCompanyId,
          documentId: document.id,
          actorType: "SYSTEM",
          action: isExpired ? "DOCUMENT_EXPIRED" : "DOCUMENT_EXPIRY_WARNING",
          previousStatus: document.verificationStatus,
          nextStatus,
          meta: { expiresAt: document.expiresAt?.toISOString() ?? null },
        },
      }),
    ]);

    await sendVerificationDecision({
      email: document.moverCompany.user.email,
      moverName: document.moverCompany.user.name,
      moverCompanyName: document.moverCompany.companyName,
      item: "Insurance document",
      status: isExpired ? "EXPIRED" : "EXPIRING",
      note: isExpired
        ? "Your profile is no longer verification-ready. Upload current insurance evidence for review."
        : `Your approved insurance evidence expires on ${document.expiresAt?.toISOString().slice(0, 10)}.`,
      dashboardUrl: getDashboardUrl(),
    }).catch((error) => console.error("Could not queue insurance expiry email", error));

    if (isExpired) expired += 1;
    else reminded += 1;
  }

  if (expired > 0) {
    revalidatePublicMovers();
    revalidateAboutPage();
  }

  return { checked: documents.length, expired, reminded };
}
