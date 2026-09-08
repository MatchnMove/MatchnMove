import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const headers = { "Cache-Control": "private, no-store, max-age=0, must-revalidate" };

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLEANER") {
    return NextResponse.json({ authenticated: false }, { headers });
  }
  const cleaner = await prisma.cleanerCompany.findUnique({ where: { userId: session.user.id }, include: { user: true } });
  if (!cleaner) return NextResponse.json({ authenticated: false }, { headers });
  return NextResponse.json({ authenticated: true, accountType: "cleaner", accountName: cleaner.companyName, status: cleaner.status, locale: cleaner.user.preferredLocale }, { headers });
}
