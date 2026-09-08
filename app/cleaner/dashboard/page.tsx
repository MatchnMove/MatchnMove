import { redirect } from "next/navigation";
import { CleanerDashboardExperience } from "@/components/cleaner-dashboard-experience";
import { auth } from "@/lib/auth";
import { requireAuthenticatedCleaner } from "@/lib/cleaner-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CleanerDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ section?: string; lead?: string }>;
}) {
  const [session, cleaner, query] = await Promise.all([
    auth(),
    requireAuthenticatedCleaner(),
    searchParams ?? Promise.resolve<{ section?: string; lead?: string }>({}),
  ]);

  if (!session?.user?.id) {
    redirect("/cleaner/login?next=%2Fcleaner%2Fdashboard");
  }
  if (session.user.role !== "CLEANER") {
    redirect(session.user.role === "ADMIN" ? "/admin/verification" : "/mover/dashboard");
  }
  if (!cleaner) {
    redirect("/cleaner/login");
  }

  return (
    <CleanerDashboardExperience
      initialSection={query.section}
      initialLeadId={query.lead}
      initialProfile={{
        companyName: cleaner.companyName,
        contactPerson: cleaner.contactPerson,
        phone: cleaner.phone,
        email: cleaner.user.email,
        emailVerified: Boolean(cleaner.user.emailVerifiedAt),
        nzbn: cleaner.nzbn ?? "",
        yearsOperating: cleaner.yearsOperating,
        serviceAreas: cleaner.serviceAreas,
        businessDescription: cleaner.businessDescription ?? "",
        status: cleaner.status,
      }}
    />
  );
}
