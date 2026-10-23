import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { acceptTeamInvitation } from "@/lib/recruitment-team";
import { RecruitmentError } from "@/lib/recruitment";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { isRecruitmentMutationRequest } from "@/lib/recruitment-request";

export async function POST(req: NextRequest) {
  if (!isRecruitmentMutationRequest(req))
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 },
    );
  if (!rateLimit(`team-activation:${getClientIp(req)}`, 6, 900000).allowed)
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 },
    );
  try {
    const text = await req.text();
    if (text.length > 64000)
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    return NextResponse.json(await acceptTeamInvitation(JSON.parse(text)), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof RecruitmentError
            ? error.message
            : error instanceof z.ZodError
              ? "Choose a password of 12–128 characters."
              : "Account setup is unavailable.",
      },
      { status: error instanceof RecruitmentError ? error.status : 400 },
    );
  }
}
