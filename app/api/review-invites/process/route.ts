import { NextRequest, NextResponse } from "next/server";
import { processAutomaticReviewInvites } from "@/lib/reviews";

function isAuthorized(request: NextRequest) {
  const configuredSecret = process.env.REVIEW_INVITE_CRON_SECRET;
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

  const limitParam = request.nextUrl.searchParams.get("limit");
  const parsedLimit = limitParam ? Number(limitParam) : 25;
  const limit = Number.isFinite(parsedLimit) ? parsedLimit : 25;

  const result = await processAutomaticReviewInvites(limit);
  return NextResponse.json(result);
}
