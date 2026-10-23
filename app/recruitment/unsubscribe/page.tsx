import { prisma } from "@/lib/db";
import { tokenHash } from "@/lib/recruitment-policy";
import { locked, suppressContact } from "@/lib/recruitment";

export const dynamic = "force-dynamic";
export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token || "";
  const exists =
    /^[a-zA-Z0-9_-]{43}$/.test(token) &&
    (await prisma.outreachMessage.findUnique({
      where: { unsubscribeHash: tokenHash(token) },
      select: { id: true },
    }));
  async function unsubscribe() {
    "use server";
    await locked(async (tx) => {
      const message = await tx.outreachMessage.findUnique({
        where: { unsubscribeHash: tokenHash(token) },
        include: { prospect: true },
      });
      if (message)
        await suppressContact(
          tx,
          message.prospect.email,
          "Unsubscribed by recipient",
          "unsubscribe",
        );
    });
    const { redirect } = await import("next/navigation");
    redirect("/recruitment/unsubscribe?done=1");
  }
  const done = ((await searchParams) as { done?: string }).done;
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <section className="max-w-lg rounded-3xl bg-white p-8 shadow-sm">
        <p className="font-bold text-teal-700">Match &apos;n Move</p>
        <h1 className="my-4 text-2xl font-bold">
          Recruitment email preferences
        </h1>
        {done ? (
          <p>You have been unsubscribed from recruitment outreach.</p>
        ) : exists ? (
          <form action={unsubscribe}>
            <p className="mb-6">
              Stop future recruitment invitations to this email address. No
              sign-in is required.
            </p>
            <button className="rounded-xl bg-slate-950 px-5 py-3 font-bold text-white">
              Unsubscribe
            </button>
          </form>
        ) : (
          <p>
            This link is unavailable. Reply to the invitation to request
            removal.
          </p>
        )}
      </section>
    </main>
  );
}
