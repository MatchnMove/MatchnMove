import assert from "node:assert/strict";
import test from "node:test";
import { canMoverAccessLeads, getMoverLeadAccessError } from "../lib/mover-lead-access";
import { isMoverProfileLive } from "../lib/mover-profile";
import { getQuoteMatchedRegions, selectLeadRecipients } from "../lib/lead-lifecycle";
import { serializeMoverLeadQuoteRequest } from "../lib/mover-lead-visibility";

const account = {
  id: "real-mover",
  status: "ACTIVE",
  serviceAreas: ["Tasman"],
  nzbnVerificationSource: null,
  user: { role: "MOVER", email: "mover@example.nz", emailVerifiedAt: new Date() },
  businessDescription: null,
  contactPerson: "Mover",
  phone: "0211234567",
  nzbn: null,
  yearsOperating: null,
  logoUrl: null,
  documents: [],
};

test("active movers can receive leads while their public verification badge is pending", () => {
  assert.equal(isMoverProfileLive(account), false);
  assert.equal(canMoverAccessLeads(account), true);
  assert.equal(getMoverLeadAccessError(account), null);
});

test("inactive, test, seeded, admin and unverified-email accounts cannot access leads", () => {
  for (const status of ["TEST", "SUSPENDED", "PENDING", "DELETING", "INACTIVE"]) {
    assert.equal(canMoverAccessLeads({ ...account, status }), false);
  }
  for (const nzbnVerificationSource of ["TEST", "SEED"]) {
    assert.equal(canMoverAccessLeads({ ...account, nzbnVerificationSource }), false);
  }
  for (const id of ["demo-1", "shared-load-1"]) {
    assert.equal(canMoverAccessLeads({ ...account, id }), false);
  }
  for (const email of ["mover@demo.matchnmove.co.nz", "mover@loadtest.matchnmove.local", "mover@loadtest.local"]) {
    assert.equal(canMoverAccessLeads({ ...account, user: { ...account.user, email } }), false);
  }
  for (const role of ["ADMIN", "CLEANER"]) {
    assert.equal(canMoverAccessLeads({ ...account, user: { ...account.user, role } }), false);
  }
  assert.equal(canMoverAccessLeads({ ...account, user: { ...account.user, emailVerifiedAt: null } }), false);
  assert.equal(canMoverAccessLeads({ ...account, serviceAreas: [] }), false);
  assert.equal(canMoverAccessLeads({ ...account, serviceAreas: ["Invalid region"] }), false);
});

test("a Tasman quote selects both active Tasman movers even with pending documents", () => {
  const regions = getQuoteMatchedRegions({ fromAddress: "", fromCity: "Murchison", fromRegion: "Tasman", toAddress: "", toCity: "Murchison", toRegion: "Tasman" });
  assert.deepEqual(regions, ["Tasman"]);
  const candidates = [
    { ...account, id: "furniture" },
    { ...account, id: "hmt", nzbnVerificationSource: "MANUAL" },
    { ...account, id: "auckland", serviceAreas: ["Auckland"] },
    { ...account, id: "test", status: "TEST" },
  ];
  const eligible = candidates.filter((mover) => mover.serviceAreas.some((region) => regions.some((match) => match === region))).filter(canMoverAccessLeads);
  assert.deepEqual(selectLeadRecipients(eligible).map((mover) => mover.id), ["furniture", "hmt"]);
  assert.equal(selectLeadRecipients(Array.from({ length: 8 }, (_, id) => ({ ...account, id: String(id) }))).length, 5);
});

test("lead eligibility does not reveal customer details until the lead is unlocked", () => {
  const quote = {
    id: "quote", name: "Private Customer", email: "private@example.nz", phone: "0210000000",
    movingWhat: "Household", bedrooms: "3", fromAddress: "12 Private Street", fromCity: "Murchison",
    fromRegion: "Tasman", fromPostcode: "7007", toAddress: "34 Private Street", toCity: "Murchison",
    toRegion: "Tasman", toPostcode: "7007", fromPropertyType: "House", toPropertyType: "House",
    moveDate: null, dateFlexible: true,
  };
  assert.equal(canMoverAccessLeads(account), true);
  for (const status of ["NEW", "NOTIFIED", "VIEWED", "ACCESS_REQUIRED"]) {
    const preview = serializeMoverLeadQuoteRequest(status, quote);
    assert.equal(preview.name, null);
    assert.equal(preview.email, null);
    assert.equal(preview.phone, null);
    assert.equal(preview.fromAddress, null);
  }
  assert.equal(serializeMoverLeadQuoteRequest("PURCHASED", quote).email, quote.email);
});
