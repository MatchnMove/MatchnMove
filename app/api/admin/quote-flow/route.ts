import { NextRequest, NextResponse } from "next/server";
import { getMoverQuoteFlowPage } from "@/lib/admin-quote-flow";
import { isAdminUser } from "@/lib/admin-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  const user = session?.user;
  if (!isAdminUser(user) || !user.mfaVerified) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const moverCompanyId = request.nextUrl.searchParams.get("moverId")?.trim();
  const cursor = request.nextUrl.searchParams.get("cursor")?.trim() || null;

  if (!moverCompanyId || moverCompanyId.length > 100) {
    return NextResponse.json({ error: "A valid mover is required." }, { status: 400 });
  }
  if (cursor && cursor.length > 100) {
    return NextResponse.json({ error: "The quote-flow cursor is invalid." }, { status: 400 });
  }

  const mover = await prisma.moverCompany.findUnique({
    where: { id: moverCompanyId },
    select: { id: true },
  });
  if (!mover) return NextResponse.json({ error: "Mover not found." }, { status: 404 });

  try {
    const page = await getMoverQuoteFlowPage(mover.id, cursor);
    return NextResponse.json(page, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("admin quote flow GET failed", error);
    return NextResponse.json({ error: "Could not load quote flow." }, { status: 500 });
  }
}
