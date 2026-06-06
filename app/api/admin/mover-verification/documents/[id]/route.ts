import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { sendVerificationDecision } from "@/lib/email";
import { calculateMoverProfileReadiness } from "@/lib/mover-profile";
import { DOCUMENT_VERIFICATION } from "@/lib/nzbn-verification";
import { revalidateAboutPage, revalidatePublicMovers } from "@/lib/public-cache";
import { adminDocumentReviewSchema } from "@/lib/validators";

async function readPayload(req: NextRequest) {
  if (req.headers.get("content-type")?.includes("form")) {
    const formData = await req.formData();
    return {
      status: formData.get("status"),
      note: formData.get("note"),
    };
  }

  return req.json().catch(() => null);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = adminDocumentReviewSchema.safeParse(await readPayload(req));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid review decision." }, { status: 400 });
  }

  const { id } = await params;
  const document = await prisma.moverDocument.findUnique({
    where: { id },
    select: {
      id: true,
      moverCompanyId: true,
      verificationStatus: true,
      type: true,
      expiresAt: true,
      scanStatus: true,
      detectedMimeType: true,
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }
  if (parsed.data.status === DOCUMENT_VERIFICATION.APPROVED) {
    const scanPassed =
      document.scanStatus === "CLEAN" ||
      (process.env.NODE_ENV !== "production" && document.scanStatus === "NOT_CONFIGURED");
    if (!scanPassed || !document.detectedMimeType) {
      return NextResponse.json({ error: "This file has not passed content validation and malware scanning." }, { status: 400 });
    }
    if (document.type === "INSURANCE" && (!document.expiresAt || document.expiresAt <= new Date())) {
      return NextResponse.json({ error: "Insurance cannot be approved without a future expiry date." }, { status: 400 });
    }
  }

  const now = new Date();
  const reviewed = parsed.data.status !== DOCUMENT_VERIFICATION.PENDING_REVIEW;
  const updatedDocument = await prisma.moverDocument.update({
    where: { id: document.id },
    data: {
      verificationStatus: parsed.data.status,
      verificationNote: parsed.data.note,
      reviewedAt: reviewed ? now : null,
      reviewedBy: reviewed ? admin.reviewerId : null,
    },
  });
  await prisma.verificationAudit.create({
    data: {
      moverCompanyId: document.moverCompanyId,
      documentId: document.id,
      actorId: admin.reviewerId,
      actorType: "ADMIN",
      action: "DOCUMENT_REVIEWED",
      previousStatus: document.verificationStatus,
      nextStatus: parsed.data.status,
      reason: parsed.data.note,
    },
  });

  const refreshedMover = await prisma.moverCompany.findUnique({
    where: { id: document.moverCompanyId },
    include: {
      user: true,
      documents: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  revalidatePublicMovers();
  revalidateAboutPage();

  if (refreshedMover && parsed.data.status !== DOCUMENT_VERIFICATION.PENDING_REVIEW) {
    await sendVerificationDecision({
      email: refreshedMover.user.email,
      moverName: refreshedMover.user.name,
      moverCompanyName: refreshedMover.companyName,
      item: document.type.replaceAll("_", " "),
      status: parsed.data.status,
      note: parsed.data.note,
      dashboardUrl: `${process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "http://localhost:3000"}/mover/dashboard?tab=profile`,
    }).catch((error) => console.error("Could not queue document decision email", error));
  }

  return NextResponse.json({
    document: {
      id: updatedDocument.id,
      moverCompanyId: updatedDocument.moverCompanyId,
      type: updatedDocument.type,
      fileName: updatedDocument.fileName ?? "Document",
      mimeType: updatedDocument.mimeType,
      fileSize: updatedDocument.fileSize,
      verificationStatus: updatedDocument.verificationStatus,
      verificationNote: updatedDocument.verificationNote,
      reviewedAt: updatedDocument.reviewedAt?.toISOString() ?? null,
      reviewedBy: updatedDocument.reviewedBy,
      createdAt: updatedDocument.createdAt.toISOString(),
    },
    readiness: refreshedMover ? calculateMoverProfileReadiness(refreshedMover) : null,
  });
}
