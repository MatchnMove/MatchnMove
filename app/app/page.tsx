import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAnyAdminUser } from "@/lib/admin-auth";
import { PartnerAuth } from "@/components/partner-auth";
import { partnerAuthReturnPath } from "@/lib/partner-auth-navigation";
export const metadata: Metadata = { title: "Business app", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function BusinessAppPage({ searchParams }: { searchParams: Promise<{ next?: string; mode?: string }> }) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  if (session?.user) {
    if (isAnyAdminUser(session.user)) redirect(session.user.mfaVerified ? "/admin/recruitment" : "/admin/mfa?next=/admin/recruitment");
    redirect(partnerAuthReturnPath(session.user.role === "CLEANER" ? "cleaner" : "mover", params.next || null, true));
  }
  return <PartnerAuth appMode initialMode={params.mode === "signup" && !params.next ? "signup" : "login"} />;
}
