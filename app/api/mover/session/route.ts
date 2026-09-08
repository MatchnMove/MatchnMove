import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { resolveLocale } from "@/lib/i18n/config";

const privateNoStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ authenticated: false }, { headers: privateNoStoreHeaders });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      name: true,
      role: true,
      preferredLocale: true,
      moverCompany: {
        select: {
          companyName: true,
        },
      },
      cleanerCompany: {
        select: {
          companyName: true,
          status: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ authenticated: false }, { headers: privateNoStoreHeaders });
  }

  const isAdmin = isAdminUser({ ...session.user, email: user.email });
  const accountType = isAdmin
    ? "admin"
    : user.role === "CLEANER"
      ? "cleaner"
      : "mover";
  const accountName = isAdmin
    ? user.name || user.email
    : accountType === "cleaner"
      ? user.cleanerCompany?.companyName || user.name || user.email
      : user.moverCompany?.companyName || user.name || user.email;

  return NextResponse.json(
    {
      authenticated: true,
      accountId: session.user.id,
      accountName,
      accountType,
      locale: resolveLocale(user.preferredLocale),
      ...(accountType === "cleaner" ? { accountStatus: user.cleanerCompany?.status ?? null } : {}),
    },
    { headers: privateNoStoreHeaders },
  );
}
