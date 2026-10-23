import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin-auth";
import { AdminNavigation } from "@/components/admin-navigation";
import { AdminTrustPanel } from "@/components/admin-trust-panel";
export const metadata = {
  title: "Trust & Customer Support | Owner",
  robots: { index: false, follow: false },
};
export default async function TrustAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/mover/login?next=/admin/trust");
  if (!isAdminUser(session.user)) redirect("/admin/recruitment");
  if (!session.user.mfaVerified) redirect("/admin/mfa?next=/admin/trust");
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <AdminNavigation current="trust" />
        <h1 className="mt-7 text-3xl font-bold">
          Trust, customer support &amp; conversion signals
        </h1>
        <AdminTrustPanel />
      </div>
    </main>
  );
}
