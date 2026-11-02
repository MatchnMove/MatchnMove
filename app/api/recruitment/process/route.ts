import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { syncRecruitmentOutcomes } from "@/lib/recruitment-outreach";
import { processMoverOutreachCampaigns } from "@/lib/mover-outreach-campaigns";

// Serverless hosts can invoke the same persisted, guarded outreach worker.
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
  return NextResponse.json({ outcomes: await syncRecruitmentOutcomes(), outreach: await processMoverOutreachCampaigns() });
}
