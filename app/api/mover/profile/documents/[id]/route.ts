import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateMoverProfileReadiness, requireAuthenticatedMover } from "@/lib/mover-profile";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const mover = await requireAuthenticatedMover();
  if (!mover) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const document = await prisma.moverDocument.findFirst({
    where: { id, moverCompanyId: mover.id },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  await prisma.moverDocument.delete({ where: { id: document.id } });

  const refreshedMover = await prisma.moverCompany.findUnique({
    where: { id: mover.id },
    include: {
      user: true,
      documents: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!refreshedMover) {
    return NextResponse.json({ error: "Mover profile not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    readiness: calculateMoverProfileReadiness(refreshedMover),
  });
}
