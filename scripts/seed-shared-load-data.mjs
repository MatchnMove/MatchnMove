import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const prisma = new PrismaClient();
const scrypt = promisify(scryptCallback);

const moverCount = Number(process.env.LOAD_TEST_MOVER_COUNT ?? 30);
const leadCount = Number(process.env.LOAD_TEST_LEAD_COUNT ?? 100);
const reviewsPerMover = Number(process.env.LOAD_TEST_REVIEWS_PER_MOVER ?? 8);
const password = process.env.LOAD_TEST_MOVER_PASSWORD ?? "LoadTest123!";
const moverEmailDomain = "loadtest.matchnmove.local";
const moverEmailPrefix = "shared-mover-";
const leadEmailPrefix = "shared-lead-";
const serviceAreaSets = [
  ["Auckland", "Northland", "Waikato"],
  ["Auckland", "Waikato", "Bay of Plenty"],
  ["Wellington", "Manawatu-Whanganui", "Taranaki"],
  ["Canterbury", "Otago", "Southland"],
  ["Nelson", "Tasman", "Marlborough"],
  ["Auckland", "Wellington", "Canterbury"],
];
const descriptionOpeners = [
  "Family-run moving team focused on careful long-distance relocations and clear communication.",
  "Full-service movers helping households and small businesses with organised, dependable move days.",
  "Experienced local crew known for tidy packing, punctual arrivals, and respectful handling of furniture.",
  "Practical moving company built for busy customers who want updates, reliability, and smooth logistics.",
];
const descriptionClosers = [
  "We specialise in household moves, apartment access planning, and friendly customer support from booking through delivery.",
  "Our team handles packing support, furniture protection, and flexible timing for customers moving between major regions.",
  "Customers use us when they want a calm, well-coordinated move with transparent expectations and professional crews.",
  "We focus on making moving day feel structured, on-time, and less stressful for families and working professionals.",
];
const reviewOpeners = [
  "The team made the move feel easy from the start.",
  "Really happy with how organised the crew was on moving day.",
  "Communication was strong throughout the whole job.",
  "They showed up on time and handled everything with real care.",
];
const reviewClosers = [
  "I would happily recommend them to anyone planning a move.",
  "The whole experience felt professional and well managed.",
  "Furniture arrived safely and the team kept us updated the whole way.",
  "It was a smooth, stress-free move and I would use them again.",
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundToOneDecimal(value) {
  return Math.round(value * 10) / 10;
}

function roundToTwoDecimals(value) {
  return Math.round(value * 100) / 100;
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function recommendationRate(values) {
  const recommendationValues = values.filter((value) => value !== null);
  return recommendationValues.length
    ? roundToOneDecimal((recommendationValues.filter(Boolean).length / recommendationValues.length) * 100)
    : 0;
}

function makeBusinessDescription(index) {
  return `${descriptionOpeners[index % descriptionOpeners.length]} ${
    descriptionClosers[index % descriptionClosers.length]
  }`;
}

function makeReviewText(moverIndex, reviewIndex) {
  const opener = reviewOpeners[(moverIndex + reviewIndex) % reviewOpeners.length];
  const closer = reviewClosers[(moverIndex + reviewIndex) % reviewClosers.length];
  return `${opener} ${closer}`;
}

function getServiceAreas(index) {
  return serviceAreaSets[(index - 1) % serviceAreaSets.length];
}

function pad(value) {
  return String(value).padStart(3, "0");
}

async function hashPassword(value) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(value, salt, 64);
  return `scrypt$${salt}$${Buffer.from(derivedKey).toString("hex")}`;
}

function moverEmail(index) {
  return `${moverEmailPrefix}${pad(index)}@${moverEmailDomain}`;
}

function leadEmail(index) {
  return `${leadEmailPrefix}${pad(index)}@${moverEmailDomain}`;
}

async function cleanupExistingData() {
  const moverUsers = await prisma.user.findMany({
    where: {
      email: {
        endsWith: `@${moverEmailDomain}`,
      },
    },
    select: {
      id: true,
      email: true,
      moverCompany: {
        select: {
          id: true,
        },
      },
    },
  });

  const moverCompanyIds = moverUsers
    .map((user) => user.moverCompany?.id)
    .filter((value) => Boolean(value));
  const moverUserIds = moverUsers.map((user) => user.id);

  const quoteRequests = await prisma.quoteRequest.findMany({
    where: {
      email: {
        startsWith: leadEmailPrefix,
      },
    },
    select: {
      id: true,
    },
  });
  const quoteRequestIds = quoteRequests.map((quote) => quote.id);

  const leadIds = await prisma.lead.findMany({
    where: {
      OR: [
        { moverCompanyId: { in: moverCompanyIds } },
        { quoteRequestId: { in: quoteRequestIds } },
      ],
    },
    select: {
      id: true,
    },
  });
  const resolvedLeadIds = leadIds.map((lead) => lead.id);

  if (resolvedLeadIds.length > 0) {
    await prisma.auditLog.deleteMany({ where: { leadId: { in: resolvedLeadIds } } });
    await prisma.payment.deleteMany({ where: { leadId: { in: resolvedLeadIds } } });
    await prisma.reviewSurveyInvite.deleteMany({ where: { leadId: { in: resolvedLeadIds } } });
    await prisma.review.deleteMany({ where: { leadId: { in: resolvedLeadIds } } });
    await prisma.lead.deleteMany({ where: { id: { in: resolvedLeadIds } } });
  }

  if (quoteRequestIds.length > 0) {
    await prisma.quoteRequest.deleteMany({
      where: {
        id: {
          in: quoteRequestIds,
        },
      },
    });
  }

  if (moverCompanyIds.length > 0) {
    await prisma.authToken.deleteMany({ where: { userId: { in: moverUserIds } } });
    await prisma.moverDocument.deleteMany({ where: { moverCompanyId: { in: moverCompanyIds } } });
    await prisma.moverCompany.deleteMany({ where: { id: { in: moverCompanyIds } } });
  }

  if (moverUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: moverUserIds } } });
  }

  return {
    deletedMoverUsers: moverUserIds.length,
    deletedQuotes: quoteRequestIds.length,
    deletedLeads: resolvedLeadIds.length,
  };
}

function buildMoverRows(passwordHash) {
  const users = [];
  const movers = [];

  for (let index = 1; index <= moverCount; index += 1) {
    const userId = `shared-load-user-${pad(index)}`;
    const moverId = `shared-load-mover-${pad(index)}`;

    users.push({
      id: userId,
      email: moverEmail(index),
      name: `Shared Load Mover ${pad(index)}`,
      passwordHash,
      emailVerifiedAt: new Date(),
      role: "MOVER",
    });

    movers.push({
      id: moverId,
      userId,
      companyName: `Shared Load Movers ${pad(index)}`,
      businessDescription: makeBusinessDescription(index),
      nzbn: `999999999${String(index).padStart(4, "0")}`,
      yearsOperating: 3 + (index % 12),
      serviceAreas: getServiceAreas(index),
      status: "ACTIVE",
      contactPerson: `Shared Contact ${pad(index)}`,
      phone: `+64 21 700 ${pad(index)}`,
      baseLeadPrice: 2000,
    });
  }

  return { users, movers };
}

function buildQuoteRows() {
  const quotes = [];

  for (let index = 1; index <= leadCount; index += 1) {
    quotes.push({
      id: `shared-load-quote-${pad(index)}`,
      name: `Shared Lead Customer ${pad(index)}`,
      email: leadEmail(index),
      phone: `+64 27 800 ${pad(index)}`,
      movingWhat: "Household furniture and boxes",
      fromPropertyType: "House",
      toPropertyType: "Apartment",
      bedrooms: String((index % 4) + 1),
      fromAddress: `${index} Queen Street`,
      fromCity: "Auckland",
      fromRegion: "Auckland",
      fromPostcode: "1010",
      fromCountry: "New Zealand",
      toAddress: `${index} Lambton Quay`,
      toCity: "Wellington",
      toRegion: "Wellington",
      toPostcode: "6011",
      toCountry: "New Zealand",
      moveDate: new Date(Date.UTC(2026, 4, (index % 27) + 1)),
      dateFlexible: false,
      transcriptionState: "manual",
    });
  }

  return quotes;
}

function buildLeadRows(movers, quotes) {
  const leads = [];

  for (const [moverIndex, mover] of movers.entries()) {
    for (const [quoteIndex, quote] of quotes.entries()) {
      const isReviewedLead = quoteIndex < reviewsPerMover;
      const statusCycle = ["NOTIFIED", "VIEWED", "PURCHASED", "CONTACTED"];
      const fallbackStatus = statusCycle[(moverIndex + quoteIndex) % statusCycle.length];

      leads.push({
        id: `${quote.id}-${mover.id}`,
        quoteRequestId: quote.id,
        moverCompanyId: mover.id,
        status: isReviewedLead ? "WON" : fallbackStatus,
        price: mover.baseLeadPrice,
        purchasedAt: isReviewedLead || fallbackStatus === "PURCHASED" || fallbackStatus === "CONTACTED"
          ? new Date(Date.UTC(2026, 3, ((quoteIndex + moverIndex) % 20) + 1))
          : null,
      });
    }
  }

  return leads;
}

function buildReviewRows(movers, quotes) {
  const reviews = [];
  const moverStats = new Map();

  for (const [moverIndex, mover] of movers.entries()) {
    const moverReviews = [];

    for (let reviewIndex = 0; reviewIndex < Math.min(reviewsPerMover, quotes.length); reviewIndex += 1) {
      const quote = quotes[reviewIndex];
      const overallRating = 4 + ((moverIndex + reviewIndex) % 2);
      const communicationRating = clamp(overallRating - ((reviewIndex + 1) % 2), 4, 5);
      const punctualityRating = clamp(overallRating, 4, 5);
      const careOfBelongingsRating = clamp(overallRating - (reviewIndex % 3 === 0 ? 1 : 0), 4, 5);
      const professionalismRating = clamp(overallRating, 4, 5);
      const valueForMoneyRating = clamp(overallRating - (reviewIndex % 4 === 0 ? 1 : 0), 3, 5);
      const recommendMover = overallRating >= 4;

      const review = {
        id: `${quote.id}-${mover.id}-review`,
        moverCompanyId: mover.id,
        leadId: `${quote.id}-${mover.id}`,
        overallRating,
        communicationRating,
        punctualityRating,
        careOfBelongingsRating,
        professionalismRating,
        valueForMoneyRating,
        writtenReview: makeReviewText(moverIndex, reviewIndex),
        recommendMover,
        moderationStatus: "APPROVED",
        isPublic: true,
        submittedAt: new Date(Date.UTC(2026, 3, 1 + ((moverIndex + reviewIndex) % 25))),
      };

      reviews.push(review);
      moverReviews.push(review);
    }

    const overallRatings = moverReviews.map((review) => review.overallRating);
    const recommendValues = moverReviews.map((review) => review.recommendMover);
    moverStats.set(mover.id, {
      averageRating: roundToTwoDecimals(average(overallRatings)),
      totalReviewCount: moverReviews.length,
      fiveStarCount: moverReviews.filter((review) => review.overallRating === 5).length,
      fourStarCount: moverReviews.filter((review) => review.overallRating === 4).length,
      threeStarCount: moverReviews.filter((review) => review.overallRating === 3).length,
      twoStarCount: moverReviews.filter((review) => review.overallRating === 2).length,
      oneStarCount: moverReviews.filter((review) => review.overallRating === 1).length,
      communicationAverage: roundToOneDecimal(average(moverReviews.map((review) => review.communicationRating))),
      punctualityAverage: roundToOneDecimal(average(moverReviews.map((review) => review.punctualityRating))),
      careOfBelongingsAverage: roundToOneDecimal(average(moverReviews.map((review) => review.careOfBelongingsRating))),
      professionalismAverage: roundToOneDecimal(average(moverReviews.map((review) => review.professionalismRating))),
      valueForMoneyAverage: roundToOneDecimal(average(moverReviews.map((review) => review.valueForMoneyRating))),
      recommendationRate: recommendationRate(recommendValues),
      leaderboardEligible: moverReviews.length >= 5,
    });
  }

  return { reviews, moverStats };
}

async function main() {
  const cleanup = await cleanupExistingData();
  const passwordHash = await hashPassword(password);
  const { users, movers } = buildMoverRows(passwordHash);
  const quotes = buildQuoteRows();
  const leads = buildLeadRows(movers, quotes);
  const { reviews, moverStats } = buildReviewRows(movers, quotes);

  await prisma.user.createMany({ data: users });
  await prisma.moverCompany.createMany({ data: movers });
  await prisma.quoteRequest.createMany({ data: quotes });
  await prisma.lead.createMany({ data: leads });
  await prisma.review.createMany({ data: reviews });

  for (const mover of movers) {
    const stats = moverStats.get(mover.id);
    if (!stats) continue;

    await prisma.moverCompany.update({
      where: { id: mover.id },
      data: stats,
    });
  }

  const [moverTotal, quoteTotal, leadTotal, reviewTotal, firstMover] = await Promise.all([
    prisma.user.count({
      where: {
        email: {
          endsWith: `@${moverEmailDomain}`,
        },
      },
    }),
    prisma.quoteRequest.count({
      where: {
        email: {
          startsWith: leadEmailPrefix,
        },
      },
    }),
    prisma.lead.count({
      where: {
        moverCompanyId: {
          in: movers.map((mover) => mover.id),
        },
      },
    }),
    prisma.review.count({
      where: {
        moverCompanyId: {
          in: movers.map((mover) => mover.id),
        },
      },
    }),
    prisma.moverCompany.findUnique({
      where: {
        id: movers[0]?.id,
      },
      include: {
        leads: true,
        reviews: true,
        user: true,
      },
    }),
  ]);

  console.log(
    JSON.stringify(
      {
        cleanup,
        created: {
          movers: moverTotal,
          quotes: quoteTotal,
          leads: leadTotal,
          reviews: reviewTotal,
        },
        login: {
          email: firstMover?.user.email ?? null,
          password,
        },
        sampleMoverLeadCount: firstMover?.leads.length ?? 0,
        sampleMoverReviewCount: firstMover?.reviews.length ?? 0,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
