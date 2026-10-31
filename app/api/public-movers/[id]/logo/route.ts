import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStoredMoverLogoKey } from "@/lib/mover-logo";
import { getPrivateDocumentUrl } from "@/lib/private-storage";

// The Location contains expiring credentials; never cache the redirect itself.
const headers = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const mover = await prisma.moverCompany.findFirst({
      where: {
        id,
        status: "ACTIVE",
      },
      select: {
        logoUrl: true,
      },
    });

    const storageKey = getStoredMoverLogoKey(mover?.logoUrl ?? null);
    if (!storageKey) {
      return NextResponse.json({ error: "Logo not found." }, { status: 404, headers });
    }

    const signedUrl = await getPrivateDocumentUrl(storageKey, "mover-logo");
    const response = NextResponse.redirect(signedUrl, 302);
    response.headers.set("Cache-Control", headers["Cache-Control"]);
    return response;
  } catch {
    return NextResponse.json({ error: "Logo service is temporarily unavailable." }, { status: 503, headers });
  }
}
