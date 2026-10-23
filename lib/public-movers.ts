import { getProfileCompleteness, getTrustLabels } from "@/lib/profile-trust";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getMoverLogoUrl } from "@/lib/mover-logo";
import { isMoverProfileLive } from "@/lib/mover-profile";
import { cacheTaggedData, PUBLIC_MOVERS_TAG } from "@/lib/public-cache";
import {
  getDisplayedReviewerName,
  getPublicReviewsForMover,
} from "@/lib/reviews";

export const publicMoverSelect = Prisma.validator<Prisma.MoverCompanySelect>()({
  id: true,
  companyName: true,
  businessDescription: true,
  logoUrl: true,
  serviceAreas: true,
  yearsOperating: true,
  yearsOperatingVerifiedAt: true,
  operatingRegion: true,
  movingServices: true,
  legacyPublicProfile: true,
  averageRating: true,
  totalReviewCount: true,
  leaderboardEligible: true,
});

const publicMoverEligibilitySelect =
  Prisma.validator<Prisma.MoverCompanySelect>()({
    ...publicMoverSelect,
    contactPerson: true,
    phone: true,
    phoneVerifiedAt: true,
    nzbn: true,
    nzbnVerificationStatus: true,
    nzbnVerificationSource: true,
    nzbnVerificationError: true,
    authorizedRepresentativeName: true,
    authorizedRepresentativeRole: true,
    authorityDeclaredAt: true,
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
        email: true,
      },
    },
  });

type PublicMoverCandidate = Prisma.MoverCompanyGetPayload<{
  select: typeof publicMoverEligibilitySelect;
}>;
type PublicMover = Prisma.MoverCompanyGetPayload<{
  select: typeof publicMoverSelect;
}> & {
  isVerifiedProfile: boolean;
  trustLabels: string[];
};

function getManuallyPublishedMoverIds() {
  return new Set(
    (process.env.MANUAL_PUBLIC_MOVER_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

function isMoverManuallyPublished(moverId: string) {
  return getManuallyPublishedMoverIds().has(moverId);
}

export function isMoverPubliclyVisible(mover: PublicMoverCandidate) {
  const isSeedRecord =
    mover.nzbnVerificationSource === "SEED" || mover.id.startsWith("demo-");
  return (
    !isSeedRecord &&
    Boolean(mover.companyName.trim()) &&
    (isMoverProfileLive(mover) || isMoverManuallyPublished(mover.id)) &&
    (mover.legacyPublicProfile || getProfileCompleteness(mover).complete)
  );
}

function toPublicMover(mover: PublicMoverCandidate): PublicMover {
  return {
    id: mover.id,
    companyName: mover.companyName,
    businessDescription: mover.businessDescription,
    logoUrl: getMoverLogoUrl(mover.id, mover.logoUrl),
    serviceAreas: mover.serviceAreas,
    yearsOperating: mover.yearsOperatingVerifiedAt
      ? mover.yearsOperating
      : null,
    yearsOperatingVerifiedAt: mover.yearsOperatingVerifiedAt,
    operatingRegion: mover.operatingRegion,
    movingServices: mover.movingServices,
    legacyPublicProfile: mover.legacyPublicProfile,
    trustLabels: getTrustLabels(mover),
    averageRating: mover.averageRating,
    totalReviewCount: mover.totalReviewCount,
    leaderboardEligible: mover.leaderboardEligible,
    isVerifiedProfile: isMoverProfileLive(mover),
  };
}

function comparePublicMoversByRating(left: PublicMover, right: PublicMover) {
  if (right.averageRating !== left.averageRating)
    return right.averageRating - left.averageRating;
  if (right.totalReviewCount !== left.totalReviewCount)
    return right.totalReviewCount - left.totalReviewCount;
  if (Number(right.leaderboardEligible) !== Number(left.leaderboardEligible)) {
    return Number(right.leaderboardEligible) - Number(left.leaderboardEligible);
  }
  const completeness =
    Number(Boolean(right.businessDescription?.trim())) -
    Number(Boolean(left.businessDescription?.trim()));
  if (completeness) return completeness;

  return left.companyName.localeCompare(right.companyName);
}

function getErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return String(error);

  return (
    error.message
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean) ?? error.name
  );
}

function logPublicMoverLoadIssue(scope: string, error: unknown) {
  if (process.env.NODE_ENV === "production") {
    console.warn(`${scope} unavailable: ${getErrorMessage(error)}`);
    return;
  }

  console.warn(
    `${scope} unavailable in local/dev runtime. Returning fallback public mover data.`,
  );
}

const loadPublicMovers = cacheTaggedData(
  async () => {
    const movers = await prisma.moverCompany.findMany({
      where: {
        status: "ACTIVE",
      },
      select: publicMoverEligibilitySelect,
      orderBy: [
        { averageRating: "desc" },
        { totalReviewCount: "desc" },
        { updatedAt: "desc" },
      ],
    });

    return movers
      .filter(isMoverPubliclyVisible)
      .map(toPublicMover)
      .sort(comparePublicMoversByRating);
  },
  ["public-movers-directory"],
  [PUBLIC_MOVERS_TAG],
);

const loadPublicMoverProfile = cacheTaggedData(
  async (moverId: string) => {
    try {
      const mover = await prisma.moverCompany.findUnique({
        where: {
          id: moverId,
        },
        select: {
          status: true,
          ...publicMoverEligibilitySelect,
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
        },
      });

      if (
        !mover ||
        mover.status !== "ACTIVE" ||
        !isMoverPubliclyVisible(mover)
      ) {
        return null;
      }

      const approvedReviews = await getPublicReviewsForMover(mover.id, 8);
      return {
        id: mover.id,
        companyName: mover.companyName,
        businessDescription: mover.businessDescription,
        logoUrl: getMoverLogoUrl(mover.id, mover.logoUrl),
        serviceAreas: mover.serviceAreas,
        yearsOperating: mover.yearsOperatingVerifiedAt
          ? mover.yearsOperating
          : null,
        yearsOperatingVerifiedAt: mover.yearsOperatingVerifiedAt,
        operatingRegion: mover.operatingRegion,
        movingServices: mover.movingServices,
        legacyPublicProfile: mover.legacyPublicProfile,
        trustLabels: getTrustLabels(mover),
        averageRating: mover.averageRating,
        totalReviewCount: mover.totalReviewCount,
        leaderboardEligible: mover.leaderboardEligible,
        isVerifiedProfile: isMoverProfileLive(mover),
        status: mover.status,
        communicationAverage: mover.communicationAverage,
        punctualityAverage: mover.punctualityAverage,
        careOfBelongingsAverage: mover.careOfBelongingsAverage,
        professionalismAverage: mover.professionalismAverage,
        valueForMoneyAverage: mover.valueForMoneyAverage,
        recommendationRate: mover.recommendationRate,
        fiveStarCount: mover.fiveStarCount,
        fourStarCount: mover.fourStarCount,
        threeStarCount: mover.threeStarCount,
        twoStarCount: mover.twoStarCount,
        oneStarCount: mover.oneStarCount,
        approvedReviews: approvedReviews.map((review) => ({
          id: review.id,
          overallRating: review.overallRating,
          writtenReview: review.writtenReview,
          recommendMover: review.recommendMover,
          submittedAt: review.submittedAt.toISOString(),
          customerName: getDisplayedReviewerName(
            review.lead.quoteRequest.name,
            review.showReviewerName,
          ),
          providerResponse: review.responseApprovedAt
            ? review.providerResponse
            : null,
          routeLabel: `${review.lead.quoteRequest.fromCity} to ${review.lead.quoteRequest.toCity}`,
        })),
      };
    } catch {
      return null;
    }
  },
  ["public-mover-profile"],
  [PUBLIC_MOVERS_TAG],
);

export async function getPublicMovers() {
  try {
    return await loadPublicMovers();
  } catch (error) {
    logPublicMoverLoadIssue("Public movers", error);
    return [];
  }
}

export async function getPublicMoverProfile(moverId: string) {
  try {
    return await loadPublicMoverProfile(moverId);
  } catch (error) {
    logPublicMoverLoadIssue("Public mover profile", error);
    return null;
  }
}
