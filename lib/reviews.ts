import { createHash, randomBytes } from "crypto";
import { Prisma, ReviewModerationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendReviewSurveyEmail } from "@/lib/email";
import { revalidatePublicMovers } from "@/lib/public-cache";

export const REVIEW_RANKING_MINIMUM = 5;
const REVIEW_SURVEY_EXPIRY_DAYS = Number(process.env.REVIEW_SURVEY_EXPIRY_DAYS ?? 14);
const LEADERBOARD_PRIOR_AVERAGE = 4.2;
const LEADERBOARD_PRIOR_WEIGHT = 5;
const AUTOMATIC_REVIEW_INVITE_DELAY_HOURS = Number(process.env.REVIEW_INVITE_DELAY_HOURS ?? 24);
const AUTO_REJECT_PATTERNS = [
  /\b(?:http:\/\/|https:\/\/|www\.)/i,
  /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i,
  /(?:\+?\d[\d\s()-]{7,}\d)/,
  /\b(?:bitcoin|crypto|seo|marketing|telegram|whatsapp|dm me|contact me)\b/i,
  /\b(?:scam site|casino|loan offer)\b/i,
  /\b(?:fuck|fucking|cunt|bitch|nigger|faggot)\b/i,
];
const MANUAL_REVIEW_PATTERNS = [
  /\b(?:refund|damage|damaged|broken|stolen|fraud|unsafe|lawsuit|legal|police|dispute|claim)\b/i,
  /\b(?:racist|sexist|abusive|threat|harass)\b/i,
];

type PrismaLike = typeof prisma | Prisma.TransactionClient;

type AutomatedModerationResult = {
  moderationStatus: ReviewModerationStatus;
  isPublic: boolean;
  requiresModeration: boolean;
  moderationReason: string;
};

type ReviewInviteAuditMeta = {
  email: string;
  expiresAt: Date;
  skipped: boolean;
  trigger: "manual_completion" | "automatic_post_move";
};

export const ANONYMOUS_REVIEWER_LABEL = "Anonymous reviewer";

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}

export function getDisplayedReviewerName(customerName: string | null | undefined, showReviewerName: boolean) {
  const normalizedName = customerName?.trim() ?? "";
  if (!showReviewerName || !normalizedName) {
    return ANONYMOUS_REVIEWER_LABEL;
  }

  return normalizedName;
}

function averageFromNullable(values: Array<number | null>) {
  const filtered = values.filter((value): value is number => value !== null);
  if (!filtered.length) return 0;

  return roundToOneDecimal(filtered.reduce((sum, value) => sum + value, 0) / filtered.length);
}

export function hashReviewSurveyToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createReviewSurveyToken() {
  return randomBytes(32).toString("hex");
}

function getAutomaticInviteCutoff() {
  return new Date(Date.now() - AUTOMATIC_REVIEW_INVITE_DELAY_HOURS * 60 * 60 * 1000);
}

function canLeadReceiveAutomaticReviewInvite(lead: {
  status: string;
  purchasedAt: Date | null;
  quoteRequest: { moveDate: Date | null; dateFlexible: boolean };
}) {
  if (!["PURCHASED", "CONTACTED", "WON"].includes(lead.status)) return false;
  if (!lead.purchasedAt) return false;
  if (!lead.quoteRequest.moveDate || lead.quoteRequest.dateFlexible) return false;

  return lead.quoteRequest.moveDate <= getAutomaticInviteCutoff();
}

function normalizeReviewText(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\S\r\n]+/g, " ");
}

function getUniqueWordRatio(value: string) {
  const words = value
    .toLowerCase()
    .match(/[a-z0-9']+/g) ?? [];
  if (!words.length) return 1;

  return new Set(words).size / words.length;
}

function hasExcessiveCharacterRepetition(value: string) {
  return /(.)\1{5,}/i.test(value);
}

function getAutomatedModerationResult(writtenReview: string | null): AutomatedModerationResult {
  if (!writtenReview) {
    return {
      moderationStatus: ReviewModerationStatus.APPROVED,
      isPublic: true,
      requiresModeration: false,
      moderationReason: "No written review provided.",
    };
  }

  const normalizedReview = normalizeReviewText(writtenReview);
  const lowercaseReview = normalizedReview.toLowerCase();
  const alphaNumericLength = (lowercaseReview.match(/[a-z0-9]/g) ?? []).length;
  const upperCaseLetters = (normalizedReview.match(/[A-Z]/g) ?? []).length;
  const letters = (normalizedReview.match(/[A-Za-z]/g) ?? []).length;
  const punctuationCount = (normalizedReview.match(/[!?$#%*]/g) ?? []).length;

  if (!alphaNumericLength) {
    return {
      moderationStatus: ReviewModerationStatus.REJECTED,
      isPublic: false,
      requiresModeration: false,
      moderationReason: "Review did not contain meaningful text.",
    };
  }

  if (AUTO_REJECT_PATTERNS.some((pattern) => pattern.test(normalizedReview))) {
    return {
      moderationStatus: ReviewModerationStatus.REJECTED,
      isPublic: false,
      requiresModeration: false,
      moderationReason: "Review matched an auto-reject safety or spam rule.",
    };
  }

  if (hasExcessiveCharacterRepetition(normalizedReview) || getUniqueWordRatio(normalizedReview) < 0.35) {
    return {
      moderationStatus: ReviewModerationStatus.REJECTED,
      isPublic: false,
      requiresModeration: false,
      moderationReason: "Review looked repetitive or spam-like.",
    };
  }

  if ((letters >= 12 && upperCaseLetters / letters > 0.8) || punctuationCount >= 8) {
    return {
      moderationStatus: ReviewModerationStatus.PENDING,
      isPublic: false,
      requiresModeration: true,
      moderationReason: "Review looked unusually formatted and needs a manual check.",
    };
  }

  if (MANUAL_REVIEW_PATTERNS.some((pattern) => pattern.test(normalizedReview))) {
    return {
      moderationStatus: ReviewModerationStatus.PENDING,
      isPublic: false,
      requiresModeration: true,
      moderationReason: "Review contains a sensitive complaint and needs a manual check.",
    };
  }

  return {
    moderationStatus: ReviewModerationStatus.APPROVED,
    isPublic: true,
    requiresModeration: false,
    moderationReason: "Review passed automatic moderation.",
  };
}

export async function recalculateMoverReviewAggregates(moverCompanyId: string, db: PrismaLike = prisma) {
  const approvedPublicReviews = await db.review.findMany({
    where: {
      moverCompanyId,
      moderationStatus: ReviewModerationStatus.APPROVED,
      isPublic: true,
    },
    select: {
      overallRating: true,
      communicationRating: true,
      punctualityRating: true,
      careOfBelongingsRating: true,
      professionalismRating: true,
      valueForMoneyRating: true,
      recommendMover: true,
    },
  });

  const totalReviewCount = approvedPublicReviews.length;
  const totalsByStar = approvedPublicReviews.reduce(
    (accumulator, review) => {
      if (review.overallRating === 5) accumulator.fiveStarCount += 1;
      if (review.overallRating === 4) accumulator.fourStarCount += 1;
      if (review.overallRating === 3) accumulator.threeStarCount += 1;
      if (review.overallRating === 2) accumulator.twoStarCount += 1;
      if (review.overallRating === 1) accumulator.oneStarCount += 1;
      return accumulator;
    },
    {
      fiveStarCount: 0,
      fourStarCount: 0,
      threeStarCount: 0,
      twoStarCount: 0,
      oneStarCount: 0,
    },
  );

  const averageRating = totalReviewCount
    ? roundToTwoDecimals(approvedPublicReviews.reduce((sum, review) => sum + review.overallRating, 0) / totalReviewCount)
    : 0;

  const recommendationVotes = approvedPublicReviews
    .map((review) => review.recommendMover)
    .filter((value): value is boolean => value !== null);

  const nextStats = {
    averageRating,
    totalReviewCount,
    ...totalsByStar,
    communicationAverage: averageFromNullable(approvedPublicReviews.map((review) => review.communicationRating)),
    punctualityAverage: averageFromNullable(approvedPublicReviews.map((review) => review.punctualityRating)),
    careOfBelongingsAverage: averageFromNullable(approvedPublicReviews.map((review) => review.careOfBelongingsRating)),
    professionalismAverage: averageFromNullable(approvedPublicReviews.map((review) => review.professionalismRating)),
    valueForMoneyAverage: averageFromNullable(approvedPublicReviews.map((review) => review.valueForMoneyRating)),
    recommendationRate: recommendationVotes.length
      ? roundToOneDecimal((recommendationVotes.filter(Boolean).length / recommendationVotes.length) * 100)
      : 0,
    leaderboardEligible: totalReviewCount >= REVIEW_RANKING_MINIMUM,
  };

  await db.moverCompany.update({
    where: { id: moverCompanyId },
    data: nextStats,
  });

  return nextStats;
}

export async function createReviewSurveyInvite(leadId: string, db: PrismaLike = prisma) {
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    include: {
      moverCompany: true,
      quoteRequest: true,
      review: true,
      reviewSurveyInvite: true,
    },
  });

  if (!lead) {
    throw new Error("Lead not found.");
  }

  if (lead.status !== "WON" && !canLeadReceiveAutomaticReviewInvite(lead)) {
    throw new Error("Review invites can only be issued for completed jobs.");
  }

  if (lead.review) {
    throw new Error("A review has already been submitted for this job.");
  }

  if (lead.reviewSurveyInvite?.consumedAt) {
    throw new Error("This job already has a consumed review invite.");
  }

  if (lead.reviewSurveyInvite) {
    await db.reviewSurveyInvite.delete({
      where: { id: lead.reviewSurveyInvite.id },
    });
  }

  const token = createReviewSurveyToken();
  const tokenHash = hashReviewSurveyToken(token);
  const expiresAt = new Date(Date.now() + REVIEW_SURVEY_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const invite = await db.reviewSurveyInvite.create({
    data: {
      moverCompanyId: lead.moverCompanyId,
      leadId: lead.id,
      tokenHash,
      customerName: lead.quoteRequest.name,
      customerEmail: lead.quoteRequest.email,
      expiresAt,
      sentAt: new Date(),
    },
    include: {
      moverCompany: true,
      lead: {
        include: {
          quoteRequest: true,
        },
      },
    },
  });

  return { invite, token };
}

function getAppBaseUrl() {
  return process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

async function recordReviewInviteAuditLog(leadId: string, meta: ReviewInviteAuditMeta) {
  await prisma.auditLog.create({
    data: {
      leadId,
      action: "review_invite_sent",
      meta,
    },
  });
}

async function sendReviewInviteForLead(leadId: string, trigger: "manual_completion" | "automatic_post_move") {
  const { invite, token } = await createReviewSurveyInvite(leadId);
  const reviewUrl = new URL(`/review/${token}`, getAppBaseUrl()).toString();

  const emailResult = await sendReviewSurveyEmail({
    email: invite.customerEmail,
    customerName: invite.customerName,
    moverCompanyName: invite.moverCompany.companyName,
    reviewUrl,
    moveRoute: `${invite.lead.quoteRequest.fromCity} to ${invite.lead.quoteRequest.toCity}`,
    expiresAt: invite.expiresAt,
  });

  await recordReviewInviteAuditLog(leadId, {
    email: invite.customerEmail,
    expiresAt: invite.expiresAt,
    skipped: emailResult.skipped,
    trigger,
  });

  return {
    ...emailResult,
    inviteId: invite.id,
    reviewUrl,
  };
}

export async function sendReviewInviteForLeadCompletion(leadId: string) {
  // Call this when the platform explicitly knows a move is complete.
  return sendReviewInviteForLead(leadId, "manual_completion");
}

export async function processAutomaticReviewInvites(limit = 25) {
  const candidates = await prisma.lead.findMany({
    where: {
      status: {
        in: ["PURCHASED", "CONTACTED", "WON"],
      },
      purchasedAt: {
        not: null,
      },
      review: null,
      reviewSurveyInvite: null,
      quoteRequest: {
        dateFlexible: false,
        moveDate: {
          not: null,
          lte: getAutomaticInviteCutoff(),
        },
      },
    },
    include: {
      quoteRequest: true,
    },
    orderBy: {
      quoteRequest: {
        moveDate: "asc",
      },
    },
    take: Math.min(Math.max(limit, 1), 100),
  });

  const results = [];

  for (const lead of candidates) {
    try {
      const result = await sendReviewInviteForLead(lead.id, "automatic_post_move");
      results.push({
        leadId: lead.id,
        customerEmail: lead.quoteRequest.email,
        sent: result.sent,
        skipped: result.skipped,
      });
    } catch (error) {
      results.push({
        leadId: lead.id,
        customerEmail: lead.quoteRequest.email,
        sent: false,
        skipped: false,
        error: error instanceof Error ? error.message : "Could not issue invite.",
      });
    }
  }

  return {
    processed: results.length,
    sent: results.filter((result) => result.sent).length,
    skipped: results.filter((result) => result.skipped).length,
    failed: results.filter((result) => result.error).length,
    results,
  };
}

export async function getReviewSurveyState(token: string) {
  const tokenHash = hashReviewSurveyToken(token);
  const invite = await prisma.reviewSurveyInvite.findUnique({
    where: { tokenHash },
    include: {
      moverCompany: true,
      lead: {
        include: {
          quoteRequest: true,
          review: true,
        },
      },
      review: true,
    },
  });

  if (!invite) {
    return { status: "invalid" as const };
  }

  if (invite.review || invite.lead.review) {
    return {
      status: "reviewed" as const,
      moverCompanyName: invite.moverCompany.companyName,
    };
  }

  if (invite.consumedAt) {
    return {
      status: "used" as const,
      moverCompanyName: invite.moverCompany.companyName,
    };
  }

  if (invite.expiresAt < new Date()) {
    return {
      status: "expired" as const,
      moverCompanyName: invite.moverCompany.companyName,
      customerName: invite.customerName,
    };
  }

  return {
    status: "valid" as const,
    invite: {
      id: invite.id,
      leadId: invite.leadId,
      customerName: invite.customerName,
      customerEmail: invite.customerEmail,
      expiresAt: invite.expiresAt,
      moverCompanyName: invite.moverCompany.companyName,
      moveDate: invite.lead.quoteRequest.moveDate,
      fromCity: invite.lead.quoteRequest.fromCity,
      toCity: invite.lead.quoteRequest.toCity,
    },
  };
}

type ReviewSubmissionInput = {
  token: string;
  overallRating: number;
  writtenReview: string | null;
  communicationRating: number | null;
  punctualityRating: number | null;
  careOfBelongingsRating: number | null;
  professionalismRating: number | null;
  valueForMoneyRating: number | null;
  recommendMover: boolean | null;
  showReviewerName: boolean;
};

export async function submitVerifiedReview(input: ReviewSubmissionInput) {
  const tokenHash = hashReviewSurveyToken(input.token);

  const result = await prisma.$transaction(async (tx) => {
    const invite = await tx.reviewSurveyInvite.findUnique({
      where: { tokenHash },
      include: {
        moverCompany: true,
        lead: {
          include: {
            review: true,
            quoteRequest: true,
          },
        },
        review: true,
      },
    });

    if (!invite) {
      throw new Error("This review link is invalid.");
    }

    if (invite.review || invite.lead.review) {
      throw new Error("A review has already been submitted for this job.");
    }

    if (invite.consumedAt) {
      throw new Error("This review link has already been used.");
    }

    if (invite.expiresAt < new Date()) {
      throw new Error("This review link has expired.");
    }

    const automatedModeration = getAutomatedModerationResult(input.writtenReview);

    const review = await tx.review.create({
      data: {
        moverCompanyId: invite.moverCompanyId,
        leadId: invite.leadId,
        reviewSurveyInviteId: invite.id,
        overallRating: input.overallRating,
        communicationRating: input.communicationRating,
        punctualityRating: input.punctualityRating,
        careOfBelongingsRating: input.careOfBelongingsRating,
        professionalismRating: input.professionalismRating,
        valueForMoneyRating: input.valueForMoneyRating,
        writtenReview: input.writtenReview,
        recommendMover: input.recommendMover,
        showReviewerName: input.showReviewerName,
        moderationStatus: automatedModeration.moderationStatus,
        isPublic: automatedModeration.isPublic,
        submittedAt: new Date(),
      },
    });

    await tx.reviewSurveyInvite.update({
      where: { id: invite.id },
      data: { consumedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        leadId: invite.leadId,
        action: "review_submitted",
        meta: {
          overallRating: input.overallRating,
          reviewId: review.id,
          showReviewerName: input.showReviewerName,
          moderationStatus: automatedModeration.moderationStatus,
          moderationReason: automatedModeration.moderationReason,
        },
      },
    });

    await recalculateMoverReviewAggregates(invite.moverCompanyId, tx);

    return {
      review,
      moverCompanyName: invite.moverCompany.companyName,
      moderationStatus: automatedModeration.moderationStatus,
      requiresModeration: automatedModeration.requiresModeration,
    };
  });

  revalidatePublicMovers();
  return result;
}

export async function updateReviewModeration(
  reviewId: string,
  moderationStatus: ReviewModerationStatus,
  options?: { isPublic?: boolean },
) {
  const review = await prisma.review.update({
    where: { id: reviewId },
    data: {
      moderationStatus,
      isPublic: moderationStatus === ReviewModerationStatus.APPROVED ? options?.isPublic ?? true : false,
    },
  });

  await recalculateMoverReviewAggregates(review.moverCompanyId);
  revalidatePublicMovers();
  return review;
}

export async function getMoverRatingsDashboardData(moverCompanyId: string) {
  const [mover, reviews] = await Promise.all([
    prisma.moverCompany.findUnique({
      where: { id: moverCompanyId },
      select: {
        averageRating: true,
        totalReviewCount: true,
        fiveStarCount: true,
        fourStarCount: true,
        threeStarCount: true,
        twoStarCount: true,
        oneStarCount: true,
        communicationAverage: true,
        punctualityAverage: true,
        careOfBelongingsAverage: true,
        professionalismAverage: true,
        valueForMoneyAverage: true,
        recommendationRate: true,
        leaderboardEligible: true,
      },
    }),
    prisma.review.findMany({
      where: { moverCompanyId },
      orderBy: { submittedAt: "desc" },
      take: 8,
      include: {
        lead: {
          include: {
            quoteRequest: true,
          },
        },
      },
    }),
  ]);

  const pendingCount = reviews.filter((review) => review.moderationStatus === ReviewModerationStatus.PENDING).length;

  return {
    summary: mover,
    pendingCount,
    recentReviews: reviews.map((review) => ({
      id: review.id,
      overallRating: review.overallRating,
      writtenReview: review.writtenReview,
      recommendMover: review.recommendMover,
      communicationRating: review.communicationRating,
      punctualityRating: review.punctualityRating,
      careOfBelongingsRating: review.careOfBelongingsRating,
      professionalismRating: review.professionalismRating,
      valueForMoneyRating: review.valueForMoneyRating,
      moderationStatus: review.moderationStatus,
      isPublic: review.isPublic,
      submittedAt: review.submittedAt.toISOString(),
      customerName: getDisplayedReviewerName(review.lead.quoteRequest.name, review.showReviewerName),
      routeLabel: `${review.lead.quoteRequest.fromCity} to ${review.lead.quoteRequest.toCity}`,
    })),
  };
}

type LeaderboardSnapshotEntry = {
  id: string;
  companyName: string;
  averageRating: number;
  totalReviewCount: number;
  leaderboardEligible: boolean;
  rank: number | null;
  isCurrentMover: boolean;
};

export function getMoverCompetitionSnapshot(
  currentMoverCompanyId: string,
  summary: Awaited<ReturnType<typeof getMoverRatingsDashboardData>>["summary"],
  leaderboard: LeaderboardSnapshotEntry[],
) {
  const rankedMoverCount = leaderboard.filter((entry) => entry.leaderboardEligible && entry.rank !== null).length;
  const currentMoverEntry = leaderboard.find((entry) => entry.id === currentMoverCompanyId) ?? null;
  const totalReviewCount = summary?.totalReviewCount ?? currentMoverEntry?.totalReviewCount ?? 0;
  const reviewsNeededToRank = Math.max(REVIEW_RANKING_MINIMUM - totalReviewCount, 0);

  if (currentMoverEntry?.leaderboardEligible && currentMoverEntry.rank !== null) {
    return {
      isRanked: true,
      rank: currentMoverEntry.rank,
      rankedMoverCount,
      reviewsNeededToRank: 0,
      value: `Rank #${currentMoverEntry.rank}`,
      detail:
        rankedMoverCount > 1
          ? `Out of ${rankedMoverCount} ranked movers`
          : "Currently ranked on the mover leaderboard",
    };
  }

  if (reviewsNeededToRank > 0) {
    return {
      isRanked: false,
      rank: null,
      rankedMoverCount,
      reviewsNeededToRank,
      value: `${reviewsNeededToRank} ${reviewsNeededToRank === 1 ? "review" : "reviews"} left`,
      detail: `Need ${REVIEW_RANKING_MINIMUM} verified public reviews to join the leaderboard`,
    };
  }

  return {
    isRanked: false,
    rank: null,
    rankedMoverCount,
    reviewsNeededToRank: 0,
    value: "Pending rank",
    detail: "Leaderboard status is updating. Refresh shortly.",
  };
}

function getLeaderboardScore(averageRating: number, totalReviewCount: number) {
  return roundToTwoDecimals(
    ((averageRating * totalReviewCount) + LEADERBOARD_PRIOR_AVERAGE * LEADERBOARD_PRIOR_WEIGHT) /
      (totalReviewCount + LEADERBOARD_PRIOR_WEIGHT),
  );
}

export async function getMoverLeaderboard(currentMoverCompanyId?: string) {
  const movers = await prisma.moverCompany.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      companyName: true,
      averageRating: true,
      totalReviewCount: true,
      leaderboardEligible: true,
    },
  });

  const rankedEligible = movers
    .filter((mover) => mover.leaderboardEligible)
    .map((mover) => ({
      ...mover,
      leaderboardScore: getLeaderboardScore(mover.averageRating, mover.totalReviewCount),
    }))
    .sort((left, right) => {
      if (right.leaderboardScore !== left.leaderboardScore) return right.leaderboardScore - left.leaderboardScore;
      if (right.averageRating !== left.averageRating) return right.averageRating - left.averageRating;
      if (right.totalReviewCount !== left.totalReviewCount) return right.totalReviewCount - left.totalReviewCount;
      return left.companyName.localeCompare(right.companyName);
    });

  const rankMap = new Map(rankedEligible.map((mover, index) => [mover.id, index + 1]));

  return movers
    .map((mover) => ({
      id: mover.id,
      companyName: mover.companyName,
      averageRating: mover.averageRating,
      totalReviewCount: mover.totalReviewCount,
      leaderboardEligible: mover.leaderboardEligible,
      rank: mover.leaderboardEligible ? rankMap.get(mover.id) ?? null : null,
      isCurrentMover: mover.id === currentMoverCompanyId,
      leaderboardScore: getLeaderboardScore(mover.averageRating, mover.totalReviewCount),
    }))
    .sort((left, right) => {
      if (Number(right.leaderboardEligible) !== Number(left.leaderboardEligible)) {
        return Number(right.leaderboardEligible) - Number(left.leaderboardEligible);
      }
      if ((right.rank ?? Number.MAX_SAFE_INTEGER) !== (left.rank ?? Number.MAX_SAFE_INTEGER)) {
        return (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER);
      }
      if (right.averageRating !== left.averageRating) return right.averageRating - left.averageRating;
      if (right.totalReviewCount !== left.totalReviewCount) return right.totalReviewCount - left.totalReviewCount;
      return left.companyName.localeCompare(right.companyName);
    });
}

export async function getPublicReviewsForMover(moverCompanyId: string, limit = 6) {
  return prisma.review.findMany({
    where: {
      moverCompanyId,
      moderationStatus: ReviewModerationStatus.APPROVED,
      isPublic: true,
      writtenReview: {
        not: null,
      },
    },
    orderBy: { submittedAt: "desc" },
    take: limit,
    include: {
      lead: {
        include: {
          quoteRequest: true,
        },
      },
    },
  });
}
