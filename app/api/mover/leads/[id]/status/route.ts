import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidateAboutPage } from "@/lib/public-cache";
import { sendReviewInviteForLeadCompletion } from "@/lib/reviews";
import { leadStatusUpdateSchema } from "@/lib/validators";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = leadStatusUpdateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const lead = await prisma.lead.findFirst({
    where: {
      id,
      moverCompany: {
        userId: session.user.id,
      },
    },
    include: {
      review: true,
    },
  });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const nextStatus = parsed.data.status;
  if ((nextStatus === "CONTACTED" || nextStatus === "WON") && !["PURCHASED", "CONTACTED", "WON"].includes(lead.status)) {
    return NextResponse.json({ error: "Unlock this lead before updating its progress." }, { status: 400 });
  }

  const updatedLead = await prisma.lead.update({
    where: { id: lead.id },
    data: { status: nextStatus },
  });

  await prisma.auditLog.create({
    data: {
      leadId: lead.id,
      action: "lead_status_updated",
      meta: {
        fromStatus: lead.status,
        toStatus: nextStatus,
      },
    },
  });

  let reviewInviteSent = false;
  let reviewInviteSkippedReason: string | null = null;

  if (nextStatus === "WON" && lead.status !== "WON" && !lead.review) {
    try {
      const inviteResult = await sendReviewInviteForLeadCompletion(lead.id);
      reviewInviteSent = !inviteResult.skipped;
      if (inviteResult.skipped) {
        reviewInviteSkippedReason = "Email is not configured, but the secure review invite was created.";
      }
    } catch (error) {
      reviewInviteSkippedReason = error instanceof Error ? error.message : "Could not create a review invite.";
    }
  }

  revalidateAboutPage();

  return NextResponse.json({
    ok: true,
    lead: updatedLead,
    reviewInviteSent,
    reviewInviteSkippedReason,
  });
}
