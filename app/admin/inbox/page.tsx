import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAnyAdminUser } from "@/lib/admin-auth";
import { inboxActor } from "@/lib/partner-inbox-access";
import { PartnerInbox } from "@/components/partner-inbox";
export const dynamic = "force-dynamic";
export const metadata = { title: "Partner inbox" };
export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string; connectionError?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/app?next=/admin/inbox");
  if (!isAnyAdminUser(session.user)) redirect("/app");
  if (!session.user.mfaVerified) redirect("/admin/mfa?next=/admin/inbox");
  try {
    await inboxActor();
  } catch {
    return (
      <section className="rounded-2xl border bg-white p-8">
        <h1 className="text-2xl font-bold">Inbox access required</h1>
        <p className="mt-3 text-slate-600">
          Ask an owner to grant inbox access. Other admin permissions do not
          automatically grant access to email conversations.
        </p>
      </section>
    );
  }
  const query = await searchParams;
  return (
    <PartnerInbox
      initialId={query.conversation?.slice(0, 128) || null}
      initialError={query.connectionError?.slice(0, 300) || ""}
    />
  );
}
