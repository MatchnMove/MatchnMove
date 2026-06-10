import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin-auth";
import { AdminMfaSetup } from "@/components/admin-mfa-setup";

function getSafeAdminPath(value: string | undefined) {
  if (!value || !value.startsWith("/admin/") || value.startsWith("//") || value.includes("\\")) {
    return "/admin/verification";
  }
  return value;
}

export default async function AdminMfaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const nextPath = getSafeAdminPath((await searchParams).next);
  const session = await auth();
  if (!session?.user) redirect(`/mover/login?next=${encodeURIComponent(nextPath)}`);
  if (!isAdminUser(session.user)) redirect("/mover/dashboard");
  if (session.user.mfaVerified) redirect(nextPath);

  return <AdminMfaSetup nextPath={nextPath} />;
}
