import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
      moverCompany: {
        select: {
          companyName: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ authenticated: false }, { headers: privateNoStoreHeaders });
  }

  return NextResponse.json(
    {
      authenticated: true,
      accountId: session.user.id,
      accountName: user.moverCompany?.companyName || user.name || user.email,
    },
    { headers: privateNoStoreHeaders },
  );
}
