import { prisma } from "@/lib/db";
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

    return [movers, successfulMoves];
  } catch {
    return [[], 0];
  }
}, ["about-page-stats"], [ABOUT_PAGE_TAG]);
