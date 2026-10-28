import { redirect } from "next/navigation";
import { AdminCleanersPanel } from "@/components/admin-cleaners-panel";
import { isAdminUser } from "@/lib/admin-auth";
import { auth } from "@/lib/auth";

export default async function AdminCleanersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/mover/login?next=/admin/cleaners");
  const nonAdminDestination = session.user.role === "CLEANER" ? "/cleaner/dashboard" : "/mover/dashboard";
  if (!isAdminUser(session.user)) redirect(nonAdminDestination);
  if (!session.user.mfaVerified) redirect("/admin/mfa?next=/admin/cleaners");

  return (
    <section className="min-w-0">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Admin operations</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-slate-950 sm:text-4xl">
              Cleaning companies and billing
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Activate cleaning partners, review their coverage, and monitor fixed-price lead invoices.
            </p>
          </div>
        </div>
        <AdminCleanersPanel />
      </div>
    </section>
  );
}
