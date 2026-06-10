import { redirect } from "next/navigation";
import { LeadSpreadsheetAdminPanel } from "@/components/lead-spreadsheet-admin-panel";
import { isAdminUser } from "@/lib/admin-auth";
import { auth } from "@/lib/auth";

export default async function AdminLeadsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/mover/login?next=/admin/leads");
  if (!isAdminUser(session.user)) redirect("/mover/dashboard");
  if (!session.user.mfaVerified) redirect("/admin/mfa?next=/admin/leads");

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Admin operations</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-slate-950 sm:text-4xl">
            Secure Google Sheets lead register
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Verify the company-owned Google Sheet, review team access, and monitor automatic lead delivery.
          </p>
        </div>
        <LeadSpreadsheetAdminPanel />
      </div>
    </main>
  );
}
