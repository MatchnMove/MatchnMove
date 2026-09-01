import { prisma } from "@/lib/db";
import { getMoverLogoUrl } from "@/lib/mover-logo";
import { ABOUT_PAGE_TAG, cacheTaggedData } from "@/lib/public-cache";

type AboutPageMover = {
  id: string;
  companyName: string;
  logoUrl: string | null;
  serviceAreas: string[];
  yearsOperating: number | null;
};

type AboutPageStats = [AboutPageMover[], number, number];

function isRealMover(mover: { id: string; nzbnVerificationSource: string | null }) {
  return mover.nzbnVerificationSource !== "SEED" && !mover.id.startsWith("demo-");
}

export const getAboutPageStats = cacheTaggedData(async (): Promise<AboutPageStats> => {
  try {
    const [movers, successfulMoves] = await Promise.all([
      prisma.moverCompany.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          companyName: true,
          nzbnVerificationSource: true,
          logoUrl: true,
          serviceAreas: true,
          yearsOperating: true,
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
      movers.filter(isRealMover).map((mover) => ({
        id: mover.id,
        companyName: mover.companyName,
        logoUrl: getMoverLogoUrl(mover.id, mover.logoUrl),
        serviceAreas: mover.serviceAreas,
        yearsOperating: mover.yearsOperating,
      })),
      successfulMoves,
      movers.filter(isRealMover).length,
    ];
  } catch {
    return [[], 0, 0];
  }
}, ["about-page-stats"], [ABOUT_PAGE_TAG]);
