import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAnyAdminUser } from "@/lib/admin-auth";
import { MoverLogin } from "@/components/mover-login";
import { moverDashboardReturnPath } from "@/lib/mover-app-navigation";

export const metadata: Metadata = { title: "Mover app login | Match 'n Move", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function MoverAppPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await auth();
  if (session?.user) {
    if (isAnyAdminUser(session.user)) redirect(session.user.mfaVerified ? "/admin/recruitment" : "/admin/mfa?next=/admin/recruitment");
    if (session.user.role === "CLEANER") redirect("/cleaner/dashboard");
    redirect(moverDashboardReturnPath((await searchParams).next));
  }
  return <MoverLogin dedicated />;
}
