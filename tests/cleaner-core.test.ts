import assert from "node:assert/strict";
import test from "node:test";
import {
  getCleanerBillingPeriod,
  getPreviousCleanerBillingPeriod,
} from "../lib/cleaner-billing";
import { CLEANING_LEAD_PRICING } from "../lib/cleaner-lead-pricing";
import {
  getCleaningGeneralLocation,
  serializeCleaningLeadForCleaner,
} from "../lib/cleaner-lead-visibility";
import { getCleaningPickupServiceArea } from "../lib/cleaning-distribution";

test("cleaning lead price is fixed at fifteen NZD", () => {
  assert.equal(CLEANING_LEAD_PRICING.fixedPrice, 15 * 100);
  assert.equal(CLEANING_LEAD_PRICING.currency, "NZD");
  assert.equal(10 * CLEANING_LEAD_PRICING.fixedPrice, 150 * 100);
});

test("Auckland billing periods follow daylight-saving boundaries", () => {
  const summer = getCleanerBillingPeriod(new Date("2026-01-15T12:00:00.000Z"));
  assert.equal(summer.key, "2026-01");
  assert.equal(summer.start.toISOString(), "2025-12-31T11:00:00.000Z");
  assert.equal(summer.nextPeriodStart.toISOString(), "2026-01-31T11:00:00.000Z");
  assert.equal(summer.end.toISOString(), "2026-01-31T10:59:59.999Z");

  const winter = getCleanerBillingPeriod(new Date("2026-07-15T12:00:00.000Z"));
  assert.equal(winter.key, "2026-07");
  assert.equal(winter.start.toISOString(), "2026-06-30T12:00:00.000Z");
  assert.equal(winter.nextPeriodStart.toISOString(), "2026-07-31T12:00:00.000Z");

  const springTransition = getCleanerBillingPeriod(new Date("2026-09-15T12:00:00.000Z"));
  assert.equal(springTransition.start.toISOString(), "2026-08-31T12:00:00.000Z");
  assert.equal(springTransition.nextPeriodStart.toISOString(), "2026-09-30T11:00:00.000Z");
});

test("previous billing period uses the Auckland calendar", () => {
  const period = getPreviousCleanerBillingPeriod(new Date("2026-01-10T00:00:00.000Z"));
  assert.equal(period.key, "2025-12");
  assert.equal(period.start.toISOString(), "2025-11-30T11:00:00.000Z");
});

test("pickup matching never considers destination data", () => {
  assert.equal(
    getCleaningPickupServiceArea({
      fromRegion: "Auckland Region",
      fromCity: "Wellington",
      fromAddress: "Christchurch",
    }),
    "Auckland",
  );
  assert.equal(
    getCleaningPickupServiceArea({
      fromRegion: "Not provided",
      fromCity: "Hamilton",
      fromAddress: "",
    }),
    "Waikato",
  );
});

const visibilityFixture = {
  id: "cleaning-lead-1",
  status: "VIEWED",
  createdAt: new Date("2026-09-08T01:00:00.000Z"),
  viewedAt: new Date("2026-09-08T02:00:00.000Z"),
  purchasedAt: null,
  purchase: null,
  cleaningRequest: {
    location: "MOVE_OUT",
    notes: "Please include the oven. Call 0210000000 at 22 Private Street.",
    quoteRequest: {
      name: "Private Customer",
      email: "private@example.com",
      phone: "0210000000",
      bedrooms: "3",
      fromAddress: "22 Private Street",
      fromCity: "Albany",
      fromRegion: "Auckland",
      fromPostcode: "0632",
      fromPropertyType: "House",
      moveDate: new Date("2026-09-18T00:00:00.000Z"),
      dateFlexible: false,
    },
  },
};

test("locked cleaning lead serialization excludes customer contact details", () => {
  const serialized = serializeCleaningLeadForCleaner(visibilityFixture);
  const json = JSON.stringify(serialized);

  assert.equal(serialized.unlocked, false);
  assert.equal(serialized.customer, null);
  assert.equal(serialized.cleaning.generalLocation, "Albany, Auckland");
  assert.equal(serialized.cleaning.notes, null);
  assert.doesNotMatch(json, /Private Customer|private@example\.com|0210000000|22 Private Street|0632/);
});

test("locked preview never treats a manual street address as its locality", () => {
  assert.equal(
    getCleaningGeneralLocation({
      fromAddress: "22 Private Street, Albany",
      fromCity: "22 Private Street, Albany",
      fromRegion: "Auckland",
    }),
    "Auckland",
  );
  assert.equal(
    getCleaningGeneralLocation({
      fromAddress: "Queen Street",
      fromCity: "Queen Street",
      fromRegion: "Auckland",
    }),
    "Auckland",
  );
});

test("a persisted purchase unlocks only cleaning-relevant customer fields", () => {
  const serialized = serializeCleaningLeadForCleaner({
    ...visibilityFixture,
    status: "PURCHASED",
    purchasedAt: new Date("2026-09-08T03:00:00.000Z"),
    purchase: {
      id: "purchase-1",
      amount: CLEANING_LEAD_PRICING.fixedPrice,
      currency: CLEANING_LEAD_PRICING.currency,
      purchasedAt: new Date("2026-09-08T03:00:00.000Z"),
    },
  });

  assert.equal(serialized.unlocked, true);
  assert.equal(serialized.customer?.email, "private@example.com");
  assert.equal(serialized.customer?.address, "22 Private Street");
  assert.match(serialized.cleaning.notes ?? "", /0210000000/);
  assert.equal(serialized.price, CLEANING_LEAD_PRICING.fixedPrice);
  assert.equal("destination" in serialized.cleaning, false);
  assert.equal("movingWhat" in serialized.cleaning, false);
});

test("deactivating a cleaner revokes purchased customer details", () => {
  const serialized = serializeCleaningLeadForCleaner({
    ...visibilityFixture,
    status: "PURCHASED",
    purchasedAt: new Date("2026-09-08T03:00:00.000Z"),
    purchase: {
      id: "purchase-1",
      amount: CLEANING_LEAD_PRICING.fixedPrice,
      currency: CLEANING_LEAD_PRICING.currency,
      purchasedAt: new Date("2026-09-08T03:00:00.000Z"),
    },
  }, { revealCustomerDetails: false });

  const json = JSON.stringify(serialized);
  assert.equal(serialized.unlocked, true);
  assert.equal(serialized.customerAccessSuspended, true);
  assert.equal(serialized.customer, null);
  assert.equal(serialized.cleaning.notes, null);
  assert.doesNotMatch(json, /Private Customer|private@example\.com|0210000000|22 Private Street|0632/);
});
