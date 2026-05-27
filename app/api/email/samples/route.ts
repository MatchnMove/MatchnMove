import { NextRequest, NextResponse } from "next/server";
import {
  sendContactNotification,
  sendMoverLeadExpiryWarningEmail,
  sendMoverNewLeadEmail,
  sendMoverPasswordResetEmail,
  sendMoverVerificationEmail,
  sendReviewSurveyEmail,
} from "@/lib/email";

function isAuthorized(request: NextRequest) {
  const configuredSecret = process.env.EMAIL_QUEUE_SECRET || process.env.REVIEW_INVITE_CRON_SECRET;
  if (!configuredSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return false;
  }

  return authorization.slice("Bearer ".length) === configuredSecret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recipient = request.nextUrl.searchParams.get("to")?.trim() || process.env.SUPPORT_EMAIL || "support@matchnmove.co.nz";
  const now = Date.now();

  const results = await Promise.all([
    sendContactNotification({
      name: "Match 'n Move Layout Test",
      email: recipient,
      message:
        "Contact notification layout test. This sample shows how internal customer enquiries will look in the Match 'n Move mailbox with the refreshed navy, teal, and orange theme.",
    }),
    sendMoverVerificationEmail({
      email: recipient,
      name: "Mover Partner",
      verificationUrl: `https://www.matchnmove.co.nz/mover/verify-email?token=layout-verification-${now}`,
    }),
    sendMoverPasswordResetEmail({
      email: recipient,
      name: "Mover Partner",
      resetUrl: `https://www.matchnmove.co.nz/mover/reset-password?token=layout-reset-${now}`,
    }),
    sendMoverNewLeadEmail({
      email: recipient,
      moverName: "Mover Partner",
      moverCompanyName: "Harbourline Relocations",
      dashboardUrl: `https://www.matchnmove.co.nz/mover/dashboard?tab=leads&lead=layout-lead-${now}`,
      customerName: "Taylor Smith",
      moveRoute: "Auckland to Hamilton",
      moveDateLabel: "12 Jun 2026",
      bedrooms: "3 bedrooms",
      price: 2000,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    }),
    sendMoverLeadExpiryWarningEmail({
      email: recipient,
      moverName: "Mover Partner",
      moverCompanyName: "Harbourline Relocations",
      dashboardUrl: `https://www.matchnmove.co.nz/mover/dashboard?tab=leads&lead=layout-lead-${now}`,
      customerName: "Taylor Smith",
      moveRoute: "Auckland to Hamilton",
      moveDateLabel: "12 Jun 2026",
      bedrooms: "3 bedrooms",
      price: 2000,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }),
    sendReviewSurveyEmail({
      email: recipient,
      customerName: "Taylor",
      moverCompanyName: "Harbourline Relocations",
      reviewUrl: `https://www.matchnmove.co.nz/review/layout-review-${now}`,
      moveRoute: "Auckland to Wellington",
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    }),
  ]);

  return NextResponse.json({
    ok: true,
    recipient,
    results,
  });
}
