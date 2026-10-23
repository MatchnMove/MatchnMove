import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { syncRecruitmentOutcomes } from "@/lib/recruitment-outreach";

// Serverless hosts can call this from their existing scheduler; it never sends outreach.
export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET || "";
  const actual = (req.headers.get("authorization") || "").replace(
    /^Bearer /,
    "",
  );
  if (
    !expected ||
    Buffer.byteLength(expected) !== Buffer.byteLength(actual) ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await syncRecruitmentOutcomes());
}
