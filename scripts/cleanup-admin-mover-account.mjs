import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

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

loadDotEnv();

const email = getArg("email")?.trim().toLowerCase();
const confirmed = process.argv.includes("--confirm");

if (!email) {
  console.error("Usage: node scripts/cleanup-admin-mover-account.mjs --email=name@example.com [--confirm]");
  process.exit(1);
}

const prisma = new PrismaClient();

async function getSummary(userId) {
  const moverCompany = await prisma.moverCompany.findUnique({
    where: { userId },
    select: { id: true, companyName: true },
  });

  if (!moverCompany) {
    return { moverCompany: null };
  }

  const leadIds = (await prisma.lead.findMany({
    where: { moverCompanyId: moverCompany.id },
    select: { id: true },
  })).map((lead) => lead.id);

  const [
    documents,
    leads,
    payments,
    auditLogs,
    reviews,
    reviewSurveyInvites,
    phoneVerificationCodes,
    verificationAudits,
  ] = await Promise.all([
    prisma.moverDocument.count({ where: { moverCompanyId: moverCompany.id } }),
    prisma.lead.count({ where: { moverCompanyId: moverCompany.id } }),
    prisma.payment.count({ where: { leadId: { in: leadIds } } }),
    prisma.auditLog.count({ where: { leadId: { in: leadIds } } }),
    prisma.review.count({ where: { moverCompanyId: moverCompany.id } }),
    prisma.reviewSurveyInvite.count({ where: { moverCompanyId: moverCompany.id } }),
    prisma.phoneVerificationCode.count({ where: { moverCompanyId: moverCompany.id } }),
    prisma.verificationAudit.count({ where: { moverCompanyId: moverCompany.id } }),
  ]);

  return {
    moverCompany,
    documents,
    leads,
    payments,
    auditLogs,
    reviews,
    reviewSurveyInvites,
    phoneVerificationCodes,
    verificationAudits,
  };
}

async function main() {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      adminMfaSecret: true,
      adminMfaEnabledAt: true,
      authTokens: { select: { id: true } },
    },
  });

  if (!user) {
    console.log(JSON.stringify({ found: false, email }, null, 2));
    return;
  }

  const summary = await getSummary(user.id);
  console.log(JSON.stringify({
    dryRun: !confirmed,
    user: {
      id: user.id,
      email: user.email,
      currentRole: user.role,
      willSetRole: "ADMIN",
      willResetAdminMfa: Boolean(user.adminMfaSecret || user.adminMfaEnabledAt),
      authTokens: user.authTokens.length,
    },
    moverData: summary,
  }, null, 2));

  if (!confirmed) {
    console.log("Dry run only. Add --confirm to delete mover data and reset this user as an admin.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    const moverCompany = await tx.moverCompany.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (moverCompany) {
      const leadIds = (await tx.lead.findMany({
        where: { moverCompanyId: moverCompany.id },
        select: { id: true },
      })).map((lead) => lead.id);

      await tx.review.deleteMany({ where: { moverCompanyId: moverCompany.id } });
      await tx.reviewSurveyInvite.deleteMany({ where: { moverCompanyId: moverCompany.id } });
      await tx.payment.deleteMany({ where: { leadId: { in: leadIds } } });
      await tx.auditLog.deleteMany({ where: { leadId: { in: leadIds } } });
      await tx.lead.deleteMany({ where: { moverCompanyId: moverCompany.id } });
      await tx.phoneVerificationCode.deleteMany({ where: { moverCompanyId: moverCompany.id } });
      await tx.verificationAudit.deleteMany({ where: { moverCompanyId: moverCompany.id } });
      await tx.moverDocument.deleteMany({ where: { moverCompanyId: moverCompany.id } });
      await tx.moverCompany.delete({ where: { id: moverCompany.id } });
    }

    await tx.authToken.deleteMany({ where: { userId: user.id } });
    await tx.phoneVerificationCode.deleteMany({ where: { userId: user.id } });
    await tx.user.update({
      where: { id: user.id },
      data: {
        role: "ADMIN",
        adminMfaSecret: null,
        adminMfaEnabledAt: null,
      },
    });
  });

  console.log("Cleanup complete. Sign in again and enroll admin MFA from /admin/verification.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
