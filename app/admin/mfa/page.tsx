import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin-auth";
import { AdminMfaSetup } from "@/components/admin-mfa-setup";

export default async function AdminMfaPage() {
  const session = await auth();
  if (!session?.user) redirect("/mover/login?next=/admin/verification");
  if (!isAdminUser(session.user)) redirect("/mover/dashboard");
  if (session.user.mfaVerified) redirect("/admin/verification");

  return <AdminMfaSetup />;
}
