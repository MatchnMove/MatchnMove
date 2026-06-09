import { NextRequest, NextResponse } from "next/server";
import { getEmailDiagnostics, processEmailQueue } from "@/lib/email";
import { processLeadLifecycle } from "@/lib/lead-lifecycle";

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

  const limitParam = request.nextUrl.searchParams.get("limit");
  const parsedLimit = limitParam ? Number(limitParam) : 50;
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(Math.floor(parsedLimit), 1), 100)
    : 50;

  const [email, leads] = await Promise.all([
    processEmailQueue(limit),
    processLeadLifecycle(limit),
  ]);

  return NextResponse.json({
    ...email,
    leads,
  });
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const parsedLimit = limitParam ? Number(limitParam) : 10;
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(Math.floor(parsedLimit), 1), 100)
    : 10;

  const result = await getEmailDiagnostics(limit);
  return NextResponse.json(result);
}
