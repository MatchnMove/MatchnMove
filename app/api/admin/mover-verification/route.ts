import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { DOCUMENT_VERIFICATION, NZBN_VERIFICATION } from "@/lib/nzbn-verification";

export async function GET(req: NextRequest) {
  const admin = await requireAdminRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [nzbnReviews, documentReviews] = await Promise.all([
    prisma.moverCompany.findMany({
      where: {
        status: "ACTIVE",
        nzbnVerificationStatus: NZBN_VERIFICATION.PENDING_REVIEW,
      },
      select: {
        id: true,
        companyName: true,
        nzbn: true,
        nzbnRegisteredName: true,
        nzbnEntityStatus: true,
        nzbnVerificationError: true,
        nzbnVerificationSource: true,
        updatedAt: true,
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: { updatedAt: "asc" },
      take: 100,
    }),
    prisma.moverDocument.findMany({
      where: {
        verificationStatus: DOCUMENT_VERIFICATION.PENDING_REVIEW,
        moverCompany: {
          status: "ACTIVE",
        },
      },
      include: {
        moverCompany: {
          select: {
            id: true,
            companyName: true,
            nzbn: true,
            nzbnVerificationStatus: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
  ]);

  return NextResponse.json({
    reviewerId: admin.reviewerId,
    nzbnReviews: nzbnReviews.map((mover) => ({
      ...mover,
      updatedAt: mover.updatedAt.toISOString(),
    })),
    documentReviews: documentReviews.map((document) => ({
      id: document.id,
      moverCompanyId: document.moverCompanyId,
      type: document.type,
      fileName: document.fileName ?? "Document",
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      expiresAt: document.expiresAt?.toISOString() ?? null,
      scanStatus: document.scanStatus,
      detectedMimeType: document.detectedMimeType,
      sha256: document.sha256,
      verificationStatus: document.verificationStatus,
      verificationNote: document.verificationNote,
      viewUrl: `/api/admin/mover-verification/documents/${document.id}/file`,
      createdAt: document.createdAt.toISOString(),
      moverCompany: document.moverCompany,
    })),
  });
}
