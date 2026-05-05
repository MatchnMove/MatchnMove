import { NextRequest, NextResponse } from "next/server";
import { reviewSubmissionSchema } from "@/lib/validators";
import { submitVerifiedReview } from "@/lib/reviews";

export async function POST(req: NextRequest) {
  try {
    const parsed = reviewSubmissionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const result = await submitVerifiedReview(parsed.data);

    return NextResponse.json({
      ok: true,
      moderationStatus: result.moderationStatus,
      requiresModeration: result.requiresModeration,
      moverCompanyName: result.moverCompanyName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not submit your review.";
    const status =
      /invalid|expired|already been submitted|already been used/i.test(message) ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
