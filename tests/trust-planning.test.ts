import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCleaningSnapshot,
  cleaningDetailsSchema,
} from "../lib/cleaning-request";
import { cleaningTarget } from "../lib/cleaning-target";
import {
  serializeCleaningLeadForCleaner,
  getCleaningGeneralLocation,
} from "../lib/cleaner-lead-visibility";
import { inventorySchema, inventorySummary } from "../lib/inventory";
import { serializeMoverLeadQuoteRequest } from "../lib/mover-lead-visibility";
import { parseChecklist, checklistDate } from "../lib/moving-checklist";
import { encryptDraft, decryptDraft } from "../lib/draft-privacy";
import { safeConversionEvent } from "../lib/conversion-policy";
import { getProfileCompleteness, getTrustLabels } from "../lib/profile-trust";
import { quoteSchema } from "../lib/validators";
const quote = {
  name: "Private Person",
  email: "private@validation.invalid",
  phone: "0219999999",
  fromAddress: "12 Old Street",
  fromCity: "Albany",
  fromRegion: "Auckland",
  fromPostcode: "0632",
  fromCountry: "New Zealand",
  fromPropertyType: "House",
  bedrooms: "3",
  toAddress: "88 New Street",
  toCity: "Hamilton",
  toRegion: "Waikato",
  toPostcode: "3204",
  toCountry: "New Zealand",
  toPropertyType: "Apartment",
  toBedrooms: "2",
  moveDate: null,
  dateFlexible: true,
};
const now = new Date("2026-10-24T00:00:00Z");
test("move-in cleaning needs explicit destination permission and real property details", () => {
  assert.equal(
    cleaningDetailsSchema.safeParse({ location: "MOVE_IN" }).success,
    false,
  );
  assert.equal(
    quoteSchema.safeParse({
      ...quote,
      sharingConsent: true,
      cleaningSelected: true,
      toPropertyType: "Unknown",
      cleaningDetails: { location: "MOVE_IN", destinationConsent: true },
    }).success,
    false,
  );
  assert.equal(
    cleaningDetailsSchema.safeParse({
      location: "MOVE_OUT",
      services: ["MOVE_IN"],
    }).success,
    false,
  );
  assert.equal(
    cleaningDetailsSchema.safeParse({ preferredDate: "2026-02-30" }).success,
    false,
  );
});
test("cleaning snapshot copies only the selected property and validates schedule", () => {
  const details = cleaningDetailsSchema.parse({
    location: "MOVE_IN",
    destinationConsent: true,
    services: ["MOVE_IN", "OVEN", "CARPET", "CARPET"],
    carpetRooms: 4,
    preferredDate: "2026-11-02",
    propertyEmpty: "YES",
    moverTiming: "BEFORE",
  });
  const target = buildCleaningSnapshot(quote, details, now);
  assert.equal(target.targetAddress, quote.toAddress);
  assert.equal(target.targetRegion, "Waikato");
  assert.equal(target.bedrooms, "2");
  assert.deepEqual(target.services, ["MOVE_IN", "OVEN", "CARPET"]);
  assert.equal(target.destinationConsentAt, now);
  assert.doesNotMatch(
    JSON.stringify(target),
    /Old Street|0632|Private Person|private@/,
  );
  const out = buildCleaningSnapshot(
    quote,
    cleaningDetailsSchema.parse({}),
    now,
  );
  assert.equal(out.targetAddress, quote.fromAddress);
  assert.equal(out.destinationConsentAt, null);
  assert.doesNotMatch(JSON.stringify(out), /New Street|3204/);
});
test("move-in never falls back to the pickup when snapshot or permission is missing", () => {
  const incomplete = cleaningTarget({
    location: "MOVE_IN",
    targetAddress: quote.toAddress,
    quoteRequest: quote,
  });
  assert.equal(incomplete.fromAddress, "");
  assert.equal(incomplete.fromRegion, "");
  const legacy = cleaningTarget({ location: "MOVE_OUT", quoteRequest: quote });
  assert.equal(legacy.fromAddress, quote.fromAddress);
});
test("cleaner preview, purchase and suspension protect both property boundaries", () => {
  const details = cleaningDetailsSchema.parse({
    location: "MOVE_IN",
    destinationConsent: true,
    services: ["OVEN"],
    accessNotes: "Private access at 88 New Street",
  });
  const lead = {
    id: "lead",
    status: "PURCHASED",
    createdAt: now,
    viewedAt: null,
    purchasedAt: now,
    purchase: null,
    cleaningRequest: {
      ...buildCleaningSnapshot(quote, details, now),
      notes: "Private notes",
      quoteRequest: quote,
    },
  };
  const locked = serializeCleaningLeadForCleaner(lead);
  assert.equal(locked.customer, null);
  assert.equal(locked.cleaning.generalLocation, "Hamilton, Waikato");
  assert.equal(locked.cleaning.accessNotes, null);
  assert.doesNotMatch(
    JSON.stringify(locked),
    /Old Street|New Street|Private notes|private@|0219999999/,
  );
  const paid = {
    ...lead,
    purchase: {
      id: "purchase",
      amount: 1500,
      currency: "NZD",
      purchasedAt: now,
    },
  };
  const unlocked = serializeCleaningLeadForCleaner(paid);
  assert.equal(unlocked.customer?.address, quote.toAddress);
  assert.equal(unlocked.customer?.postcode, "3204");
  assert.doesNotMatch(JSON.stringify(unlocked), /Old Street|0632/);
  const suspended = serializeCleaningLeadForCleaner(paid, {
    revealCustomerDetails: false,
  });
  assert.equal(suspended.customer, null);
  assert.equal(suspended.cleaning.notes, null);
  assert.equal(suspended.cleaning.accessNotes, null);
});
test("manual preview localities and property fields cannot carry contact details", () => {
  assert.equal(
    getCleaningGeneralLocation({
      fromAddress: "Hidden",
      fromCity: quote.email,
      fromRegion: "Auckland",
    }),
    "Auckland",
  );
  const lead = {
    id: "lead",
    status: "NEW",
    createdAt: now,
    viewedAt: null,
    purchasedAt: null,
    purchase: null,
    cleaningRequest: {
      location: "MOVE_OUT",
      notes: null,
      quoteRequest: {
        ...quote,
        bedrooms: quote.phone,
        fromPropertyType: quote.email,
      },
    },
  };
  const preview = serializeCleaningLeadForCleaner(lead);
  assert.equal(preview.cleaning.bedrooms, "Not supplied");
  assert.equal(preview.cleaning.propertyType, "Not supplied");
});
test("inventory validates bounds and only reaches unlocked mover details", () => {
  const items = inventorySchema.parse([
    {
      id: "custom",
      label: "Heavy safe",
      room: "Other",
      quantity: 2,
      notes: "Discuss lifting equipment",
    },
  ]);
  assert.match(inventorySummary(items), /Heavy safe/);
  assert.equal(inventorySchema.safeParse([items[0], items[0]]).success, false);
  assert.equal(
    inventorySchema.safeParse([{ ...items[0], quantity: 201 }]).success,
    false,
  );
  assert.equal(
    inventorySchema.safeParse([{ ...items[0], quantity: -1 }]).success,
    false,
  );
  const record = {
    ...quote,
    id: "request",
    movingWhat: "General goods",
    inventory: items,
  };
  assert.equal(serializeMoverLeadQuoteRequest("NEW", record).movingWhat, null);
  assert.match(
    serializeMoverLeadQuoteRequest("PURCHASED", record).movingWhat!,
    /Heavy safe/,
  );
});
test("saved drafts use authenticated encryption and reject tampering", () => {
  const input = {
    form: { name: quote.name, email: quote.email },
    inventory: [{ notes: "Private access" }],
  };
  const ciphertext = encryptDraft(input);
  assert.doesNotMatch(ciphertext, /Private|validation/);
  assert.deepEqual(decryptDraft(ciphertext), input);
  const parts = ciphertext.split(".");
  const tampered = parts[2][0] === "A" ? "B" : "A";
  parts[2] = tampered + parts[2].slice(1);
  assert.throws(() => decryptDraft(parts.join(".")));
});
test("checklist dates cross month and NZ daylight saving boundaries safely", () => {
  assert.equal(checklistDate("2026-10-01", -7), "2026-09-24");
  assert.equal(checklistDate("2026-03-01", -1), "2026-02-28");
  assert.equal(checklistDate("2026-02-30", 0), null);
  const time = Date.now();
  const state = {
    version: 1,
    date: "2026-11-10",
    done: ["quotes"],
    expiresAt: time + 86400000,
  };
  assert.deepEqual(parseChecklist(JSON.stringify(state), time), state);
  assert.equal(
    parseChecklist(JSON.stringify({ ...state, expiresAt: time - 1 }), time),
    null,
  );
  assert.equal(
    parseChecklist(JSON.stringify({ ...state, done: ["unknown"] }), time),
    null,
  );
  assert.equal(
    parseChecklist('{"version":1,"date":"private address"}', time),
    null,
  );
});
test("analytics discard arbitrary PII, URLs and unknown events", () => {
  assert.deepEqual(
    safeConversionEvent("quote_step_complete", {
      step: 2,
      source: "quote_form",
      email: quote.email,
      address: quote.fromAddress,
      url: "https://example.com/?secret=1",
    }),
    { name: "quote_step_completed", source: "quote_form", step: 2 },
  );
  assert.equal(
    safeConversionEvent("free_form_event", { value: quote.phone }),
    null,
  );
  assert.deepEqual(
    safeConversionEvent("calculator_used", { source: quote.email, step: 99 }),
    { name: "calculator_used", source: undefined, step: undefined },
  );
});
test("profile completeness and identity checks remain separate from service quality", () => {
  const profile = {
    companyName: "Mover",
    businessDescription: "Short",
    serviceAreas: ["Auckland"],
    user: { email: "mover@validation.invalid", emailVerifiedAt: now },
    nzbnVerificationStatus: "VERIFIED",
  };
  const status = getProfileCompleteness(profile);
  assert.equal(status.complete, false);
  assert.ok(status.missing.includes("Moving services"));
  assert.ok(status.missing.includes("Operating location"));
  assert.ok(status.missing.includes("Business description"));
  assert.deepEqual(getTrustLabels(profile), [
    "Business identity checked",
    "Email confirmed",
  ]);
  assert.doesNotMatch(
    getTrustLabels(profile).join(" "),
    /insured|quality|rating/i,
  );
});
