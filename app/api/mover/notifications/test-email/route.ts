import { NextResponse } from "next/server";
import { sendMoverLeadAlertTestEmail } from "@/lib/email";
import { requireAuthenticatedMover } from "@/lib/mover-profile";
import { rateLimit } from "@/lib/rate-limit";

const privateNoStoreHeaders = { "Cache-Control": "private, no-store" };

function getPublicBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://www.matchnmove.co.nz").replace(/\/$/, "");
}

export async function POST() {
  const mover = await requireAuthenticatedMover();
  if (!mover) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: privateNoStoreHeaders });
  }
  if (!mover.user.emailVerifiedAt) {
    return NextResponse.json(
      { error: "Verify your account email before testing lead alerts." },
      { status: 403, headers: privateNoStoreHeaders },
    );
  }
  if (!rateLimit(`mover-lead-alert-test:${mover.id}`, 3, 60 * 60_000).allowed) {
    return NextResponse.json(
      { error: "You have already sent several tests. Please try again in an hour." },
      { status: 429, headers: privateNoStoreHeaders },
    );
  }

  const result = await sendMoverLeadAlertTestEmail({
    email: mover.user.email,
    moverName: mover.contactPerson || mover.user.name,
    moverCompanyName: mover.companyName,
    dashboardUrl: `${getPublicBaseUrl()}/mover/dashboard?tab=leads`,
  });

  if (!result.sent) {
    console.error("Mover lead-alert test was not accepted", {
      moverCompanyId: mover.id,
      emailDeliveryId: result.emailDeliveryId,
      error: result.error,
    });
    return NextResponse.json(
      {
        error: "The alert test could not be accepted for delivery yet. Please try again shortly.",
        queued: result.queued,
      },
      { status: result.queued ? 503 : 502, headers: privateNoStoreHeaders },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      accepted: true,
      message: "Google accepted the test. Check Inbox and Spam, then add the sender to your contacts.",
    },
    { headers: privateNoStoreHeaders },
  );
}
