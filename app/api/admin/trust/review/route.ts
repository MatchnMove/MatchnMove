import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
export async function GET(req: NextRequest) {
  if (!(await requireAdminRequest(req)))
    return NextResponse.json(
      { error: "Owner access required" },
      { status: 403 },
    );
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!id || id.length > 80)
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  const r = await prisma.review.findUnique({
    where: { id },
    select: {
      id: true,
      writtenReview: true,
      overallRating: true,
      moderationStatus: true,
      providerResponse: true,
      responseApprovedAt: true,
      moverCompany: { select: { companyName: true } },
    },
  });
  return NextResponse.json(r ?? { error: "Not found" }, {
    status: r ? 200 : 404,
    headers: { "Cache-Control": "private, no-store" },
  });
}
