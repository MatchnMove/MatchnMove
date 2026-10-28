import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin-auth";
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
    <section className="min-w-0">
      <div className="mx-auto max-w-6xl">
        <h1 className="mt-7 text-3xl font-bold">
          Trust, customer support &amp; conversion signals
        </h1>
        <AdminTrustPanel />
      </div>
    </section>
  );
}
