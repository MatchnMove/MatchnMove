import { prisma } from "@/lib/db";
import { isMoverProfileLive } from "@/lib/mover-profile";
import { getMoverLogoUrl } from "@/lib/mover-logo";
import { ABOUT_PAGE_TAG, cacheTaggedData } from "@/lib/public-cache";

type AboutPageMover = {
  id: string;
  companyName: string;
  logoUrl: string | null;
  serviceAreas: string[];
  yearsOperating: number | null;
};

type AboutPageStats = [AboutPageMover[], number];

export const getAboutPageStats = cacheTaggedData(async (): Promise<AboutPageStats> => {
  try {
    const [movers, successfulMoves] = await Promise.all([
      prisma.moverCompany.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          companyName: true,
          businessDescription: true,
          contactPerson: true,
          phone: true,
          phoneVerifiedAt: true,
          nzbn: true,
          nzbnVerificationStatus: true,
          nzbnVerificationError: true,
          authorizedRepresentativeName: true,
          authorizedRepresentativeRole: true,
          authorityDeclaredAt: true,
          logoUrl: true,
          serviceAreas: true,
          yearsOperating: true,
          documents: {
            select: {
              id: true,
              type: true,
              verificationStatus: true,
              expiresAt: true,
              scanStatus: true,
              detectedMimeType: true,
            },
          },
          user: {
            select: {
              emailVerifiedAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.lead.count({
        where: {
          status: {
            in: ["PURCHASED", "CONTACTED", "WON"],
          },
        },
      }),
    ]);

    return [
      movers.filter(isMoverProfileLive).map((mover) => ({
        id: mover.id,
        companyName: mover.companyName,
        logoUrl: getMoverLogoUrl(mover.id, mover.logoUrl),
        serviceAreas: mover.serviceAreas,
        yearsOperating: mover.yearsOperating,
      })),
      successfulMoves,
    ];
  } catch {
    return [[], 0];
  }
}, ["about-page-stats"], [ABOUT_PAGE_TAG]);
