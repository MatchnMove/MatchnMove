import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function main() {
  const { prisma } = await import("../lib/db");
  const { isAdminUser } = await import("../lib/admin-auth");
  const { locked, audit } = await import("../lib/recruitment");
  const args = process.argv.slice(2);
  const value = (key: string) => args[args.indexOf(key) + 1];
  if (!args.includes("--user-id") || !args.includes("--email"))
    throw new Error(
      "Supply --user-id VERIFIED_EXISTING_ID --email VERIFIED_EXISTING_EMAIL. Default is a dry run; --apply writes the OWNER role.",
    );
  const id = value("--user-id");
  const email = value("--email").trim().toLowerCase();
  try {
    await locked(async (tx) => {
      const user = await tx.user.findUnique({ where: { id } });
      if (
        !user ||
        user.email.toLowerCase() !== email ||
        !user.emailVerifiedAt ||
        !isAdminUser(user) ||
        user.adminDisabledAt
      )
        throw new Error(
          "The exact verified, existing owner-authorised account must match. No account was changed.",
        );
      if (!args.includes("--apply")) {
        console.log(
          "Verified existing admin account. Dry run only; use --apply after confirming this is Lance's account.",
        );
        return;
      }
      await tx.user.update({
        where: { id },
        data: {
          adminRole: "OWNER",
          canSendRecruitment: true,
          canViewRecruitmentLeads: true,
          sessionVersion: { increment: 1 },
        },
      });
      await audit(tx, id, "verified_owner_role_assigned", { userId: id });
      console.log(
        "OWNER assigned to the explicitly verified existing account. Sign in again.",
      );
    });
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Owner assignment failed",
  );
  process.exitCode = 1;
});
