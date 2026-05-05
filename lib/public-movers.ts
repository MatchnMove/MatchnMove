import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { cacheTaggedData, PUBLIC_MOVERS_TAG } from "@/lib/public-cache";
import { getDisplayedReviewerName, getPublicReviewsForMover } from "@/lib/reviews";

export const publicMoverSelect = Prisma.validator<Prisma.MoverCompanySelect>()({
  id: true,
  companyName: true,
  businessDescription: true,
  logoUrl: true,
  serviceAreas: true,
  yearsOperating: true,
  averageRating: true,
  totalReviewCount: true,
  leaderboardEligible: true,
});

type PublicMoverCandidate = Prisma.MoverCompanyGetPayload<{ select: typeof publicMoverSelect }>;

export function isMoverPubliclyVisible(mover: PublicMoverCandidate) {
  // Public directory eligibility is intentionally based on the fields this app actually maintains today:
  // movers must be active, have a company name, and provide at least one service area.
  // Email verification is not enforced here because current seeded/local mover accounts are active but may
  // not have emailVerifiedAt populated, which would incorrectly hide legitimate public profiles.
  return Boolean(mover.companyName.trim() && mover.serviceAreas.length > 0);
}

function comparePublicMoversByRating(left: PublicMoverCandidate, right: PublicMoverCandidate) {
  if (right.averageRating !== left.averageRating) return right.averageRating - left.averageRating;
  if (right.totalReviewCount !== left.totalReviewCount) return right.totalReviewCount - left.totalReviewCount;
  if (Number(right.leaderboardEligible) !== Number(left.leaderboardEligible)) {
    return Number(right.leaderboardEligible) - Number(left.leaderboardEligible);
  }
  if ((right.yearsOperating ?? -1) !== (left.yearsOperating ?? -1)) {
    return (right.yearsOperating ?? -1) - (left.yearsOperating ?? -1);
  }

  return left.companyName.localeCompare(right.companyName);
}

const loadPublicMovers = cacheTaggedData(async () => {
  const movers = await prisma.moverCompany.findMany({
    where: {
      status: "ACTIVE",
    },
    select: publicMoverSelect,
    orderBy: [{ averageRating: "desc" }, { totalReviewCount: "desc" }, { updatedAt: "desc" }],
  });

  return movers.filter(isMoverPubliclyVisible).sort(comparePublicMoversByRating);
}, ["public-movers-directory"], [PUBLIC_MOVERS_TAG]);

const loadPublicMoverProfile = cacheTaggedData(async (moverId: string) => {
  const mover = await prisma.moverCompany.findUnique({
    where: {
      id: moverId,
    },
    select: {
      ...publicMoverSelect,
      status: true,
      communicationAverage: true,
      punctualityAverage: true,
      careOfBelongingsAverage: true,
      professionalismAverage: true,
      valueForMoneyAverage: true,
      recommendationRate: true,
      fiveStarCount: true,
      fourStarCount: true,
      threeStarCount: true,
      twoStarCount: true,
      oneStarCount: true,
      contactPerson: true,
    },
  });

  if (!mover || mover.status !== "ACTIVE" || !isMoverPubliclyVisible(mover)) {
    return null;
  }

  const approvedReviews = await getPublicReviewsForMover(mover.id, 8);

  return {
    ...mover,
    approvedReviews: approvedReviews.map((review) => ({
      id: review.id,
      overallRating: review.overallRating,
      writtenReview: review.writtenReview,
      recommendMover: review.recommendMover,
      submittedAt: review.submittedAt.toISOString(),
      customerName: getDisplayedReviewerName(review.lead.quoteRequest.name, review.showReviewerName),
      routeLabel: `${review.lead.quoteRequest.fromCity} to ${review.lead.quoteRequest.toCity}`,
    })),
  };
}, ["public-mover-profile"], [PUBLIC_MOVERS_TAG]);

export async function getPublicMovers() {
  try {
    return await loadPublicMovers();
  } catch (error) {
    console.error("Failed to load public movers", error);
    return [];
  }
}

export async function getPublicMoverProfile(moverId: string) {
  try {
    return await loadPublicMoverProfile(moverId);
  } catch (error) {
    console.error("Failed to load public mover profile", error);
    return null;
  }
}
