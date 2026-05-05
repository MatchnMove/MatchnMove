import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const prisma = new PrismaClient();
const scrypt = promisify(scryptCallback);

const password = process.env.DEMO_MOVER_PASSWORD ?? "DemoMover123!";
const demoDomain = "demo.matchnmove.co.nz";
const baseDate = new Date(Date.UTC(2026, 3, 20, 9, 0, 0));

const movers = [
  {
    id: "demo-mover-harbourline",
    userId: "demo-user-harbourline",
    email: `harbourline@${demoDomain}`,
    name: "Mia Thompson",
    companyName: "Harbourline Relocations",
    contactPerson: "Mia Thompson",
    phone: "+64 21 482 119",
    nzbn: "9429048123456",
    yearsOperating: 11,
    logoUrl: "/images/movers/harbourline-relocations.svg",
    serviceAreas: ["Auckland", "Northland", "Waikato"],
    businessDescription:
      "Harbourline Relocations is an Auckland-based moving team built around careful packing, clear updates, and calm execution on moving day. The crew specialises in apartments, family homes, and inter-region moves across the upper North Island.",
    baseLeadPrice: 2400,
    reviews: [
      ["Sophie Carter", "Auckland", "Hamilton", 5, "Mia and the crew were organised from the first call. They protected the furniture properly, arrived on time, and kept us updated all day."],
      ["Daniel Wright", "Takapuna", "Whangarei", 5, "The move felt calm and well planned. They handled a tricky apartment lift with no fuss and everything arrived in great condition."],
      ["Amelia Rose", "Auckland", "Tauranga", 4, "Friendly team, fair communication, and careful handling. I would happily use Harbourline again for another move."],
      ["Noah Patel", "Ponsonby", "Albany", 5, "Very professional movers. The quote was clear, the timing was accurate, and the team treated our place respectfully."],
      ["Grace Lee", "Auckland", "Matakana", 5, "Excellent experience from booking through delivery. Nothing felt rushed and the crew worked really efficiently."],
      ["Ethan Miller", "Mt Eden", "Cambridge", 4, "Good service and reliable updates. They made a long day much easier than expected."],
    ],
    leads: [
      ["VIEWED", "Liam Parker", "Auckland", "Whangarei", "Three-bedroom home, boxed kitchen items, two beds"],
      ["CONTACTED", "Emma Wilson", "North Shore", "Hamilton", "Apartment furniture and fragile dining table"],
      ["PURCHASED", "Oliver Brown", "Auckland", "Tauranga", "Household furniture, garage shelves, outdoor setting"],
    ],
  },
  {
    id: "demo-mover-summit-shift",
    userId: "demo-user-summit-shift",
    email: `summit@${demoDomain}`,
    name: "James McKenzie",
    companyName: "Summit Shift Movers",
    contactPerson: "James McKenzie",
    phone: "+64 27 633 408",
    nzbn: "9429048765432",
    yearsOperating: 8,
    logoUrl: "/images/movers/summit-shift.svg",
    serviceAreas: ["Wellington", "Manawatu-Whanganui", "Taranaki"],
    businessDescription:
      "Summit Shift Movers helps households and small businesses move through Wellington and the lower North Island with practical planning and steady communication. Their team is known for tidy packing, careful stair access, and reliable arrival windows.",
    baseLeadPrice: 2200,
    reviews: [
      ["Hannah Cooper", "Wellington", "Palmerston North", 5, "Summit Shift were fantastic. They planned around narrow stairs, wrapped everything well, and finished earlier than expected."],
      ["Ben Taylor", "Lower Hutt", "New Plymouth", 4, "Really solid moving company. Communication was clear and the team worked hard through bad weather."],
      ["Isla Anderson", "Wellington", "Kapiti", 5, "The crew were polite, careful, and very organised. It was the smoothest move we have had."],
      ["Lucas Martin", "Porirua", "Wellington", 5, "Great attention to detail. They labelled boxes, protected doorways, and made the unload simple."],
      ["Ruby Harris", "Wellington", "Whanganui", 4, "Helpful team and good value. A little traffic delay, but they kept us informed the whole way."],
      ["Jack Walker", "Petone", "Levin", 5, "Professional, punctual, and friendly. I would recommend Summit Shift without hesitation."],
    ],
    leads: [
      ["NOTIFIED", "Mason Clark", "Wellington", "Nelson", "Two-bedroom apartment, office desk, bikes"],
      ["VIEWED", "Charlotte Young", "Lower Hutt", "Kapiti", "Family home and garden tools"],
      ["WON", "Henry Scott", "Wellington", "Palmerston North", "Small office move with computers and filing cabinets"],
    ],
  },
  {
    id: "demo-mover-coastal-carry",
    userId: "demo-user-coastal-carry",
    email: `coastal@${demoDomain}`,
    name: "Aroha Williams",
    companyName: "Coastal Carry Co",
    contactPerson: "Aroha Williams",
    phone: "+64 22 915 774",
    nzbn: "9429048987654",
    yearsOperating: 6,
    logoUrl: "/images/movers/coastal-carry.svg",
    serviceAreas: ["Canterbury", "Otago", "Southland"],
    businessDescription:
      "Coastal Carry Co supports South Island customers with home moves, storage transitions, and careful long-distance transport. The team focuses on friendly service, realistic timeframes, and extra care for fragile furniture and appliances.",
    baseLeadPrice: 2100,
    reviews: [
      ["Emily Jones", "Christchurch", "Dunedin", 5, "Aroha's team made our South Island move feel easy. They were careful, cheerful, and very clear about timing."],
      ["Oscar Evans", "Queenstown", "Invercargill", 5, "Excellent movers. Everything was wrapped properly and the crew were patient with a difficult driveway."],
      ["Lily Turner", "Christchurch", "Timaru", 4, "Very good service and friendly staff. They made sure fragile boxes were separated and checked at arrival."],
      ["Leo Robinson", "Dunedin", "Christchurch", 5, "Reliable, fast, and professional. The dashboard updates matched what actually happened on the day."],
      ["Zoe Mitchell", "Wanaka", "Queenstown", 4, "Good communication and careful handling. I appreciated the clear quote and no surprises."],
      ["Theo Campbell", "Christchurch", "Oamaru", 5, "Great experience. The team was punctual and treated our belongings like their own."],
    ],
    leads: [
      ["CONTACTED", "Harper King", "Christchurch", "Dunedin", "Storage unit, queen bed, lounge suite"],
      ["PURCHASED", "Finn Adams", "Queenstown", "Wanaka", "Apartment move with lift access"],
      ["VIEWED", "Molly Baker", "Timaru", "Christchurch", "Three-bedroom house and piano"],
    ],
  },
];

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

async function hashPassword(value) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(value, salt, 64);
  return `scrypt$${salt}$${Buffer.from(derivedKey).toString("hex")}`;
}

function roundToTwoDecimals(value) {
  return Math.round(value * 100) / 100;
}

function roundToOneDecimal(value) {
  return Math.round(value * 10) / 10;
}

function average(values) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function reviewDetails(overallRating, index) {
  return {
    overallRating,
    communicationRating: Math.max(4, overallRating - (index % 3 === 0 ? 1 : 0)),
    punctualityRating: Math.max(4, overallRating),
    careOfBelongingsRating: Math.max(4, overallRating - (index % 4 === 0 ? 1 : 0)),
    professionalismRating: Math.max(4, overallRating),
    valueForMoneyRating: Math.max(4, overallRating - (index % 5 === 0 ? 1 : 0)),
    recommendMover: true,
  };
}

async function cleanupExistingDemoData() {
  const moverIds = movers.map((mover) => mover.id);
  const userIds = movers.map((mover) => mover.userId);
  const quotePrefix = "demo-quote-";

  const quoteRequests = await prisma.quoteRequest.findMany({
    where: { id: { startsWith: quotePrefix } },
    select: { id: true },
  });
  const quoteIds = quoteRequests.map((quote) => quote.id);

  const leads = await prisma.lead.findMany({
    where: {
      OR: [{ moverCompanyId: { in: moverIds } }, { quoteRequestId: { in: quoteIds } }],
    },
    select: { id: true },
  });
  const leadIds = leads.map((lead) => lead.id);

  if (leadIds.length > 0) {
    await prisma.auditLog.deleteMany({ where: { leadId: { in: leadIds } } });
    await prisma.payment.deleteMany({ where: { leadId: { in: leadIds } } });
    await prisma.reviewSurveyInvite.deleteMany({ where: { leadId: { in: leadIds } } });
    await prisma.review.deleteMany({ where: { leadId: { in: leadIds } } });
    await prisma.lead.deleteMany({ where: { id: { in: leadIds } } });
  }

  if (quoteIds.length > 0) {
    await prisma.quoteRequest.deleteMany({ where: { id: { in: quoteIds } } });
  }

  await prisma.authToken.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.moverDocument.deleteMany({ where: { moverCompanyId: { in: moverIds } } });
  await prisma.moverCompany.deleteMany({ where: { id: { in: moverIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  return { deletedLeads: leadIds.length, deletedQuotes: quoteIds.length };
}

function quoteData({ id, name, email, fromCity, toCity, movingWhat, daysFromBase }) {
  return {
    id,
    name,
    email,
    phone: "+64 21 555 010",
    movingWhat,
    fromPropertyType: "House",
    toPropertyType: "House",
    bedrooms: "3",
    fromAddress: `12 ${fromCity} Road`,
    fromCity,
    fromRegion: fromCity,
    fromPostcode: "1010",
    fromCountry: "New Zealand",
    toAddress: `24 ${toCity} Street`,
    toCity,
    toRegion: toCity,
    toPostcode: "6011",
    toCountry: "New Zealand",
    moveDate: addDays(baseDate, daysFromBase),
    dateFlexible: daysFromBase % 2 === 0,
    transcriptFields: {
      currentProperty: { type: "House", bedrooms: "3" },
      destinationProperty: { knownType: "yes", type: "House", bedrooms: "3" },
      selectedItems: [{ item: "Sofa (3 Seater)", qty: 1 }, { item: "Boxes", qty: 24 }],
    },
    transcriptionState: "manual",
  };
}

async function createDemoData() {
  const passwordHash = await hashPassword(password);
  const allQuoteRows = [];
  const allLeadRows = [];
  const allPaymentRows = [];
  const allAuditRows = [];
  const allReviewRows = [];
  const moverStats = new Map();

  for (const [moverIndex, mover] of movers.entries()) {
    await prisma.user.create({
      data: {
        id: mover.userId,
        email: mover.email,
        name: mover.name,
        passwordHash,
        emailVerifiedAt: baseDate,
        role: "MOVER",
        moverCompany: {
          create: {
            id: mover.id,
            companyName: mover.companyName,
            businessDescription: mover.businessDescription,
            nzbn: mover.nzbn,
            yearsOperating: mover.yearsOperating,
            logoUrl: mover.logoUrl,
            serviceAreas: mover.serviceAreas,
            status: "ACTIVE",
            contactPerson: mover.contactPerson,
            phone: mover.phone,
            baseLeadPrice: mover.baseLeadPrice,
          },
        },
      },
    });

    const reviewMetrics = [];

    for (const [reviewIndex, [customerName, fromCity, toCity, rating, reviewText]] of mover.reviews.entries()) {
      const quoteId = `demo-quote-${mover.id}-review-${reviewIndex + 1}`;
      const leadId = `demo-lead-${mover.id}-review-${reviewIndex + 1}`;
      const metrics = reviewDetails(rating, reviewIndex);

      allQuoteRows.push(
        quoteData({
          id: quoteId,
          name: customerName,
          email: `review-${moverIndex + 1}-${reviewIndex + 1}@${demoDomain}`,
          fromCity,
          toCity,
          movingWhat: "Household furniture, labelled boxes, and fragile kitchen items",
          daysFromBase: reviewIndex + moverIndex,
        }),
      );

      allLeadRows.push({
        id: leadId,
        quoteRequestId: quoteId,
        moverCompanyId: mover.id,
        status: "WON",
        price: mover.baseLeadPrice,
        purchasedAt: addDays(baseDate, reviewIndex - 14),
      });

      allPaymentRows.push({
        id: `demo-payment-${mover.id}-${reviewIndex + 1}`,
        leadId,
        amount: mover.baseLeadPrice,
        status: "SUCCEEDED",
        stripePaymentIntentId: `pi_demo_${moverIndex + 1}_${reviewIndex + 1}`,
        stripeChargeId: `ch_demo_${moverIndex + 1}_${reviewIndex + 1}`,
        receiptUrl: "https://dashboard.stripe.com/test/payments",
      });

      allAuditRows.push({
        id: `demo-audit-${mover.id}-${reviewIndex + 1}`,
        leadId,
        action: "demo_lead_completed",
        meta: { source: "demo-seed" },
      });

      allReviewRows.push({
        id: `demo-review-${mover.id}-${reviewIndex + 1}`,
        moverCompanyId: mover.id,
        leadId,
        ...metrics,
        writtenReview: reviewText,
        showReviewerName: true,
        moderationStatus: "APPROVED",
        isPublic: true,
        submittedAt: addDays(baseDate, reviewIndex - 7),
      });

      reviewMetrics.push(metrics);
    }

    for (const [leadIndex, [status, customerName, fromCity, toCity, movingWhat]] of mover.leads.entries()) {
      const quoteId = `demo-quote-${mover.id}-dashboard-${leadIndex + 1}`;
      const leadId = `demo-lead-${mover.id}-dashboard-${leadIndex + 1}`;
      const purchased = ["PURCHASED", "CONTACTED", "WON"].includes(status);

      allQuoteRows.push(
        quoteData({
          id: quoteId,
          name: customerName,
          email: `lead-${moverIndex + 1}-${leadIndex + 1}@${demoDomain}`,
          fromCity,
          toCity,
          movingWhat,
          daysFromBase: leadIndex + 20,
        }),
      );

      allLeadRows.push({
        id: leadId,
        quoteRequestId: quoteId,
        moverCompanyId: mover.id,
        status,
        price: mover.baseLeadPrice,
        purchasedAt: purchased ? addDays(baseDate, leadIndex - 2) : null,
      });

      if (purchased) {
        allPaymentRows.push({
          id: `demo-payment-${mover.id}-dashboard-${leadIndex + 1}`,
          leadId,
          amount: mover.baseLeadPrice,
          status: "PENDING",
        });
      }
    }

    const overallRatings = reviewMetrics.map((review) => review.overallRating);
    moverStats.set(mover.id, {
      averageRating: roundToTwoDecimals(average(overallRatings)),
      totalReviewCount: reviewMetrics.length,
      fiveStarCount: reviewMetrics.filter((review) => review.overallRating === 5).length,
      fourStarCount: reviewMetrics.filter((review) => review.overallRating === 4).length,
      threeStarCount: 0,
      twoStarCount: 0,
      oneStarCount: 0,
      communicationAverage: roundToOneDecimal(average(reviewMetrics.map((review) => review.communicationRating))),
      punctualityAverage: roundToOneDecimal(average(reviewMetrics.map((review) => review.punctualityRating))),
      careOfBelongingsAverage: roundToOneDecimal(average(reviewMetrics.map((review) => review.careOfBelongingsRating))),
      professionalismAverage: roundToOneDecimal(average(reviewMetrics.map((review) => review.professionalismRating))),
      valueForMoneyAverage: roundToOneDecimal(average(reviewMetrics.map((review) => review.valueForMoneyRating))),
      recommendationRate: 100,
      leaderboardEligible: true,
    });
  }

  await prisma.quoteRequest.createMany({ data: allQuoteRows });
  await prisma.lead.createMany({ data: allLeadRows });
  await prisma.payment.createMany({ data: allPaymentRows });
  await prisma.auditLog.createMany({ data: allAuditRows });
  await prisma.review.createMany({ data: allReviewRows });

  for (const mover of movers) {
    await prisma.moverCompany.update({
      where: { id: mover.id },
      data: moverStats.get(mover.id),
    });
  }
}

async function main() {
  const cleanup = await cleanupExistingDemoData();
  await createDemoData();

  console.log(
    JSON.stringify(
      {
        cleanup,
        created: {
          movers: movers.length,
          reviews: movers.reduce((total, mover) => total + mover.reviews.length, 0),
          dashboardLeads: movers.reduce((total, mover) => total + mover.leads.length, 0),
        },
        logins: movers.map((mover) => ({ company: mover.companyName, email: mover.email, password })),
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
