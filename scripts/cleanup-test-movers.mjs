import { DeleteObjectsCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

const KEEP_COMPANY = "Otago Movers";
const TEST_STATUS = "TEST";
const MOVER_EMAIL_KINDS = [
  "mover_verification",
  "mover_password_reset",
  "mover_sign_in_code",
  "mover_new_lead",
  "mover_lead_expiry_warning",
  "verification_expiry_warning",
  "verification_decision",
];

const confirmed = process.argv.includes("--confirm");
const prisma = new PrismaClient();

function normalizeCompanyName(value) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function getStoredLogoKey(logoUrl) {
  return logoUrl?.startsWith("storage:") ? logoUrl.slice("storage:".length) : null;
}

function getStorageClient() {
  const accessKeyId = process.env.STORAGE_ACCESS_KEY?.trim();
  const secretAccessKey = process.env.STORAGE_SECRET_KEY?.trim();
  const bucket = process.env.STORAGE_BUCKET?.trim();
  if (!accessKeyId || !secretAccessKey || !bucket) return null;

  return {
    bucket,
    client: new S3Client({
      region: process.env.STORAGE_REGION?.trim() || "auto",
      endpoint: process.env.STORAGE_ENDPOINT?.trim() || undefined,
      forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === "true",
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

async function deleteStoredFiles(keys) {
  const uniqueKeys = [...new Set(keys.filter(Boolean))];
  if (!uniqueKeys.length) return;

  const storage = getStorageClient();
  if (!storage) {
    throw new Error(`Storage is not configured; refusing to leave ${uniqueKeys.length} private file(s) orphaned.`);
  }

  for (let index = 0; index < uniqueKeys.length; index += 1000) {
    const batch = uniqueKeys.slice(index, index + 1000);
    const result = await storage.client.send(
      new DeleteObjectsCommand({
        Bucket: storage.bucket,
        Delete: {
          Objects: batch.map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );
    if (result.Errors?.length) {
      throw new Error(`Could not delete ${result.Errors.length} stored mover file(s).`);
    }
  }
}

async function deleteStripeCustomers(customerIds) {
  const uniqueIds = [...new Set(customerIds.filter(Boolean))];
  if (!uniqueIds.length) return;
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(`Stripe is not configured; refusing to leave ${uniqueIds.length} customer(s) orphaned.`);
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  for (const customerId of uniqueIds) {
    try {
      await stripe.customers.del(customerId);
    } catch (error) {
      if (error?.code !== "resource_missing") throw error;
    }
  }
}

async function getMoverSnapshot() {
  return prisma.moverCompany.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      userId: true,
      companyName: true,
      status: true,
      stripeCustomerId: true,
      logoUrl: true,
      leaderboardEligible: true,
      totalReviewCount: true,
      user: {
        select: {
          email: true,
          role: true,
        },
      },
      documents: {
        select: {
          storageKey: true,
        },
      },
      _count: {
        select: {
          documents: true,
          leads: true,
          reviews: true,
          reviewSurveyInvites: true,
          verificationAudits: true,
        },
      },
    },
  });
}

async function removeMoverData(tx, mover, { deleteProfile }) {
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

  if (!deleteProfile) return;

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

  if (mover.user.role === "MOVER") {
    await tx.user.delete({ where: { id: mover.userId } });
  }
}

async function main() {
  const movers = await getMoverSnapshot();
  const keepMatches = movers.filter(
    (mover) => normalizeCompanyName(mover.companyName) === normalizeCompanyName(KEEP_COMPANY),
  );

  if (keepMatches.length !== 1) {
    throw new Error(
      `Expected exactly one "${KEEP_COMPANY}" profile, found ${keepMatches.length}. No changes were made.`,
    );
  }

  const keepMover = keepMatches[0];
  const deleteMovers = movers.filter((mover) => mover.id !== keepMover.id);
  const storedFileKeys = deleteMovers.flatMap((mover) => [
    ...mover.documents.map((document) => document.storageKey),
    getStoredLogoKey(mover.logoUrl),
  ]);
  const stripeCustomerIds = movers.map((mover) => mover.stripeCustomerId);

  console.log(
    JSON.stringify(
      {
        dryRun: !confirmed,
        keep: {
          id: keepMover.id,
          companyName: keepMover.companyName,
          email: keepMover.user.email,
          currentStatus: keepMover.status,
          nextStatus: TEST_STATUS,
          resetLeads: keepMover._count.leads,
          resetReviews: keepMover._count.reviews,
          resetReviewInvites: keepMover._count.reviewSurveyInvites,
        },
        delete: deleteMovers.map((mover) => ({
          id: mover.id,
          companyName: mover.companyName,
          email: mover.user.email,
          role: mover.user.role,
          stripeCustomer: Boolean(mover.stripeCustomerId),
          ...mover._count,
        })),
        totals: {
          moverProfilesToDelete: deleteMovers.length,
          moverUsersToDelete: deleteMovers.filter((mover) => mover.user.role === "MOVER").length,
          storedFilesToDelete: storedFileKeys.filter(Boolean).length,
          stripeCustomersToDelete: stripeCustomerIds.filter(Boolean).length,
        },
      },
      null,
      2,
    ),
  );

  if (!confirmed) {
    console.log("Dry run only. Add --confirm to apply this cleanup.");
    return;
  }

  await deleteStoredFiles(storedFileKeys);
  await deleteStripeCustomers(stripeCustomerIds);

  await prisma.$transaction(
    async (tx) => {
      await removeMoverData(tx, keepMover, { deleteProfile: false });
      await tx.moverCompany.update({
        where: { id: keepMover.id },
        data: {
          status: TEST_STATUS,
          stripeCustomerId: null,
          nzbnVerificationSource: "TEST",
          leaderboardEligible: false,
          averageRating: 0,
          totalReviewCount: 0,
          fiveStarCount: 0,
          fourStarCount: 0,
          threeStarCount: 0,
          twoStarCount: 0,
          oneStarCount: 0,
          communicationAverage: 0,
          punctualityAverage: 0,
          careOfBelongingsAverage: 0,
          professionalismAverage: 0,
          valueForMoneyAverage: 0,
          recommendationRate: 0,
        },
      });

      for (const mover of deleteMovers) {
        await removeMoverData(tx, mover, { deleteProfile: true });
      }
    },
    {
      maxWait: 10_000,
      timeout: 120_000,
    },
  );

  const remaining = await prisma.moverCompany.findMany({
    select: {
      id: true,
      companyName: true,
      status: true,
      leaderboardEligible: true,
      totalReviewCount: true,
    },
  });
  console.log(JSON.stringify({ cleanupComplete: true, remainingMoverProfiles: remaining }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
