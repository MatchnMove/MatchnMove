import fs from "node:fs";
import { DeleteObjectsCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

const MOVER_EMAIL_KINDS = [
  "mover_verification",
  "mover_password_reset",
  "mover_sign_in_code",
  "mover_new_lead",
  "mover_lead_expiry_warning",
  "verification_expiry_warning",
  "verification_decision",
];

function loadDotEnv() {
  if (!fs.existsSync(".env")) return;
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

function getArg(name) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function getStoredLogoKey(logoUrl) {
  return logoUrl?.startsWith("storage:") ? logoUrl.slice("storage:".length) : null;
}

function getConfiguredAdminEmails() {
  return new Set(
    (process.env.MOVER_ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
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

async function deleteStripeCustomer(customerId) {
  if (!customerId) return;
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured; refusing to leave the mover customer orphaned.");
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  try {
    await stripe.customers.del(customerId);
  } catch (error) {
    if (error?.code !== "resource_missing") throw error;
  }
}

loadDotEnv();

const email = getArg("email")?.trim().toLowerCase();
const expectedUserId = getArg("expected-user-id")?.trim();
const expectedMoverId = getArg("expected-mover-id")?.trim();
const confirmed = process.argv.includes("--confirm");

if (!email) {
  console.error(
    "Usage: node scripts/delete-mover-account.mjs --email=name@example.com [--confirm --expected-user-id=... --expected-mover-id=...]",
  );
  process.exit(1);
}

const prisma = new PrismaClient();

async function getSnapshot() {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      moverCompany: {
        select: {
          id: true,
          companyName: true,
          status: true,
          stripeCustomerId: true,
          logoUrl: true,
          documents: { select: { storageKey: true } },
        },
      },
      _count: {
        select: {
          authTokens: true,
          phoneVerificationCodes: true,
        },
      },
    },
  });

  if (!user?.moverCompany) return user ? { user, mover: null } : null;

  const mover = user.moverCompany;
  const leadIds = (await prisma.lead.findMany({
    where: { moverCompanyId: mover.id },
    select: { id: true },
  })).map((lead) => lead.id);
  const [
    documents,
    leads,
    payments,
    pendingPayments,
    auditLogs,
    reviews,
    reviewSurveyInvites,
    verificationAudits,
    emailDeliveries,
    adminAuditLogs,
  ] = await Promise.all([
    prisma.moverDocument.count({ where: { moverCompanyId: mover.id } }),
    prisma.lead.count({ where: { moverCompanyId: mover.id } }),
    prisma.payment.count({ where: { leadId: { in: leadIds } } }),
    prisma.payment.count({ where: { leadId: { in: leadIds }, status: "PENDING", amount: { gt: 0 } } }),
    prisma.auditLog.count({ where: { leadId: { in: leadIds } } }),
    prisma.review.count({ where: { moverCompanyId: mover.id } }),
    prisma.reviewSurveyInvite.count({ where: { moverCompanyId: mover.id } }),
    prisma.verificationAudit.count({ where: { moverCompanyId: mover.id } }),
    prisma.emailDelivery.count({
      where: {
        recipient: user.email,
        kind: { in: MOVER_EMAIL_KINDS },
      },
    }),
    prisma.adminAuditLog.count({ where: { actorId: user.id } }),
  ]);
  const storedFileKeys = [
    ...mover.documents.map((document) => document.storageKey),
    getStoredLogoKey(mover.logoUrl),
  ].filter(Boolean);

  return {
    user,
    mover,
    leadIds,
    storedFileKeys,
    counts: {
      documents,
      leads,
      payments,
      pendingPayments,
      auditLogs,
      reviews,
      reviewSurveyInvites,
      verificationAudits,
      authTokens: user._count.authTokens,
      phoneVerificationCodes: user._count.phoneVerificationCodes,
      emailDeliveries,
      adminAuditLogs,
    },
  };
}

async function main() {
  const snapshot = await getSnapshot();

  if (!snapshot) {
    console.log(JSON.stringify({ found: false, email }, null, 2));
    return;
  }
  if (!snapshot.mover) {
    throw new Error(`User ${email} exists but has no mover company. No changes were made.`);
  }

  const { user, mover, leadIds, storedFileKeys, counts } = snapshot;
  const configuredAdmin = getConfiguredAdminEmails().has(user.email.toLowerCase());
  console.log(JSON.stringify({
    dryRun: !confirmed,
    target: {
      userId: user.id,
      moverCompanyId: mover.id,
      email: user.email,
      role: user.role,
      companyName: mover.companyName,
      status: mover.status,
      configuredAdmin,
      stripeCustomer: Boolean(mover.stripeCustomerId),
      storedFiles: storedFileKeys.length,
    },
    recordsToDelete: counts,
  }, null, 2));

  if (!confirmed) {
    console.log("Dry run only. Confirm with the exact user and mover IDs shown above.");
    return;
  }
  if (!expectedUserId || !expectedMoverId || expectedUserId !== user.id || expectedMoverId !== mover.id) {
    throw new Error("The expected user or mover ID does not match. No changes were made.");
  }
  if (user.role !== "MOVER") {
    throw new Error(`Refusing to delete a ${user.role} user with the mover cleanup command.`);
  }
  if (configuredAdmin) {
    throw new Error(
      `Refusing to delete while ${user.email} remains in MOVER_ADMIN_EMAILS. Remove it from the allow-list first.`,
    );
  }
  if (counts.pendingPayments > 0) {
    throw new Error("Refusing to delete an account with unresolved billable lead charges.");
  }

  await deleteStoredFiles(storedFileKeys);
  await deleteStripeCustomer(mover.stripeCustomerId);

  await prisma.$transaction(async (tx) => {
    await tx.review.deleteMany({ where: { moverCompanyId: mover.id } });
    await tx.reviewSurveyInvite.deleteMany({ where: { moverCompanyId: mover.id } });
    await tx.payment.deleteMany({ where: { leadId: { in: leadIds } } });
    await tx.auditLog.deleteMany({ where: { leadId: { in: leadIds } } });
    await tx.lead.deleteMany({ where: { moverCompanyId: mover.id } });
    await tx.phoneVerificationCode.deleteMany({
      where: { OR: [{ moverCompanyId: mover.id }, { userId: user.id }] },
    });
    await tx.verificationAudit.deleteMany({ where: { moverCompanyId: mover.id } });
    await tx.moverDocument.deleteMany({ where: { moverCompanyId: mover.id } });
    await tx.authToken.deleteMany({ where: { userId: user.id } });
    await tx.emailDelivery.deleteMany({
      where: {
        recipient: user.email,
        kind: { in: MOVER_EMAIL_KINDS },
      },
    });
    await tx.adminAuditLog.deleteMany({ where: { actorId: user.id } });
    await tx.moverCompany.delete({ where: { id: mover.id } });
    await tx.user.delete({ where: { id: user.id } });
  }, { maxWait: 10_000, timeout: 120_000 });

  const remaining = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  console.log(JSON.stringify({ deleted: !remaining, email, userId: user.id, moverCompanyId: mover.id }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
