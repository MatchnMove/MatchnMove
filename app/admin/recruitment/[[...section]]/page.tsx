import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminUser, isAnyAdminUser } from "@/lib/admin-auth";
import { RecruitmentWorkspace } from "@/components/recruitment-workspace";

export const dynamic = "force-dynamic";
export default async function RecruitmentPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const sectionParts = (await params).section || [];
  const section = sectionParts[0] || "dashboard";
  if (
    sectionParts.length > 1 ||
    ![
      "dashboard",
      "prospects",
      "leads",
      "messages",
      "tasks",
      "performance",
      "team",
      "settings",
    ].includes(section)
  )
    notFound();
  const session = await auth();
  if (!session?.user)
    redirect("/mover/login?mode=login&next=/admin/recruitment");
  if (!isAnyAdminUser(session.user)) redirect("/mover/dashboard");
  if (!session.user.mfaVerified) redirect("/admin/mfa?next=/admin/recruitment");
  const owner = isAdminUser({ ...session.user });
  if (["team", "settings"].includes(section) && !owner)
    redirect("/admin/recruitment");
  return (
    <RecruitmentWorkspace
      actor={{
        id: session.user.id,
        name: session.user.name || session.user.email,
        role: owner ? "OWNER" : "RECRUITMENT_ADMIN",
        canSend: owner || session.user.canSendRecruitment,
        canViewLeads: owner || session.user.canViewRecruitmentLeads,
      }}
      section={section}
    />
  );
}
