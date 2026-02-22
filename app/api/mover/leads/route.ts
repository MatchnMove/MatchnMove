import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mover = await prisma.moverCompany.findFirst({ where: { user: { email: session.user.email } } });
  if (!mover) return NextResponse.json([]);

  const leads = await prisma.lead.findMany({ where: { moverCompanyId: mover.id }, include: { quoteRequest: true } });
  return NextResponse.json(leads);
}
