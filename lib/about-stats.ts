import { prisma } from "@/lib/db";
import { ABOUT_PAGE_TAG, cacheTaggedData } from "@/lib/public-cache";

export const getAboutPageStats = cacheTaggedData(async () => {
  return Promise.all([
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
}, ["about-page-stats"], [ABOUT_PAGE_TAG]);
