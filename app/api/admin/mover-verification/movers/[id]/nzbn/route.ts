import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { calculateMoverProfileReadiness } from "@/lib/mover-profile";
import { NZBN_VERIFICATION } from "@/lib/nzbn-verification";
import { revalidateAboutPage, revalidatePublicMovers } from "@/lib/public-cache";
import { adminNzbnReviewSchema } from "@/lib/validators";

async function readPayload(req: NextRequest) {
  if (req.headers.get("content-type")?.includes("form")) {
    const formData = await req.formData();
    return {
      status: formData.get("status"),
      registeredName: formData.get("registeredName"),
      entityStatus: formData.get("entityStatus"),
      note: formData.get("note"),
    };
  }

  return req.json().catch(() => null);
}

function getDefaultReviewError(status: string) {
  if (status === NZBN_VERIFICATION.PENDING_REVIEW) return "Manual NZBN review is still in progress.";
  if (status === NZBN_VERIFICATION.FAILED) return "Manual NZBN verification did not pass.";
  return null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = adminNzbnReviewSchema.safeParse(await readPayload(req));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid NZBN review decision." }, { status: 400 });
  }

  const { id } = await params;
  const mover = await prisma.moverCompany.findUnique({
    where: { id },
    select: {
      id: true,
      companyName: true,
      nzbnRegisteredName: true,
      nzbnEntityStatus: true,
    },
  });

  if (!mover) {
    return NextResponse.json({ error: "Mover profile not found." }, { status: 404 });
  }

  const verified = parsed.data.status === NZBN_VERIFICATION.VERIFIED;
  const reset = parsed.data.status === NZBN_VERIFICATION.UNVERIFIED;
  const updatedMover = await prisma.moverCompany.update({
    where: { id: mover.id },
    data: {
      nzbnVerificationStatus: parsed.data.status,
      nzbnVerifiedAt: verified ? new Date() : null,
      nzbnRegisteredName: reset ? null : parsed.data.registeredName ?? mover.nzbnRegisteredName ?? (verified ? mover.companyName : null),
      nzbnEntityStatus: reset ? null : parsed.data.entityStatus ?? mover.nzbnEntityStatus,
      nzbnVerificationSource: reset ? null : "MANUAL",
      nzbnVerificationError: verified ? null : parsed.data.note ?? getDefaultReviewError(parsed.data.status),
    },
    include: {
      user: true,
      documents: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  revalidatePublicMovers();
  revalidateAboutPage();

  return NextResponse.json({
    mover: {
      id: updatedMover.id,
      companyName: updatedMover.companyName,
      nzbn: updatedMover.nzbn,
      nzbnVerificationStatus: updatedMover.nzbnVerificationStatus,
      nzbnRegisteredName: updatedMover.nzbnRegisteredName,
      nzbnEntityStatus: updatedMover.nzbnEntityStatus,
      nzbnVerifiedAt: updatedMover.nzbnVerifiedAt?.toISOString() ?? null,
      nzbnVerificationSource: updatedMover.nzbnVerificationSource,
      nzbnVerificationError: updatedMover.nzbnVerificationError,
    },
    readiness: calculateMoverProfileReadiness(updatedMover),
    reviewerId: admin.reviewerId,
  });
}
