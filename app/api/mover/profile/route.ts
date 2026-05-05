import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { calculateMoverProfileReadiness, requireAuthenticatedMover } from "@/lib/mover-profile";
import { revalidateAboutPage, revalidatePublicMovers } from "@/lib/public-cache";
import { moverProfileSchema, sanitiseServiceAreas } from "@/lib/validators";

function serialiseProfile(mover: NonNullable<Awaited<ReturnType<typeof requireAuthenticatedMover>>>) {
  const readiness = calculateMoverProfileReadiness(mover);

  return {
    companyName: mover.companyName,
    businessDescription: mover.businessDescription ?? "",
    contactPerson: mover.contactPerson ?? "",
    phone: mover.phone ?? "",
    nzbn: mover.nzbn ?? "",
    yearsOperating: mover.yearsOperating ?? null,
    serviceAreas: sanitiseServiceAreas(mover.serviceAreas),
    email: mover.user.email,
    emailVerified: Boolean(mover.user.emailVerifiedAt),
    logoUrl: mover.logoUrl,
    documents: mover.documents.map((document) => ({
      id: document.id,
      type: document.type,
      fileName: document.fileName ?? "Document",
      mimeType: document.mimeType ?? null,
      fileSize: document.fileSize ?? null,
      viewUrl: `/api/mover/profile/documents/${document.id}/file`,
      createdAt: document.createdAt.toISOString(),
    })),
    readiness,
  };
}

export async function GET() {
  const mover = await requireAuthenticatedMover();
  if (!mover) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(serialiseProfile(mover));
}

export async function PATCH(req: NextRequest) {
  const mover = await requireAuthenticatedMover();
  if (!mover) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit(`mover-profile:${mover.id}`, 20, 60_000).allowed) {
    return NextResponse.json({ error: "Too many profile update attempts. Please try again shortly." }, { status: 429 });
  }

  const parsed = moverProfileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid profile details" }, { status: 400 });
  }

  const serviceAreas = sanitiseServiceAreas(parsed.data.serviceAreas);
  const publicFieldsChanged =
    mover.businessDescription !== parsed.data.businessDescription ||
    mover.yearsOperating !== parsed.data.yearsOperating ||
    mover.serviceAreas.length !== serviceAreas.length ||
    mover.serviceAreas.some((area, index) => area !== serviceAreas[index]);

  const updatedMover = await prisma.moverCompany.update({
    where: { id: mover.id },
    data: {
      contactPerson: parsed.data.contactPerson,
      phone: parsed.data.phone,
      nzbn: parsed.data.nzbn,
      yearsOperating: parsed.data.yearsOperating,
      serviceAreas,
      businessDescription: parsed.data.businessDescription,
    },
    include: {
      user: true,
      documents: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (publicFieldsChanged) {
    revalidatePublicMovers();
    revalidateAboutPage();
  }

  return NextResponse.json(serialiseProfile(updatedMover));
}
