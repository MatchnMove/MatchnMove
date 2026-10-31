import type { Metadata } from "next";
import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { isAdminUser, isAnyAdminUser } from "@/lib/admin-auth";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: { default: "Administration | Match 'n Move", template: "%s | Match 'n Move" },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user || !isAnyAdminUser(session.user) || !session.user.mfaVerified) return children;
  const owner = isAdminUser({ ...session.user });
  const inbox = owner ? true : Boolean((await prisma.user.findUnique({ where: { id: session.user.id }, select: { canAccessPartnerInbox: true } }))?.canAccessPartnerInbox);
  return <AdminShell actor={{
    name: session.user.name || session.user.email,
    role: owner ? "OWNER" : "RECRUITMENT_ADMIN",
    canViewLeads: owner || session.user.canViewRecruitmentLeads,
    canAccessInbox: inbox,
  }}>{children}</AdminShell>;
}

