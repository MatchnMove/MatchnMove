import assert from "node:assert/strict";
import test from "node:test";
import { cleanerProfileSchema, cleanerRegisterSchema } from "../lib/validators";
import { canCleanerAccessLeads, getCleanerActivationError } from "../lib/cleaner-readiness";

const registration = {
  name: "Test Cleaner",
  companyName: "Test Cleaning Company",
  email: "cleaner@example.com",
  phone: "021 234 5678",
  password: "TestPassword123",
  confirmPassword: "TestPassword123",
  acceptedTerms: true,
};

test("cleaners can register before choosing dashboard regions", () => {
  assert.deepEqual(cleanerRegisterSchema.parse(registration).serviceAreas, []);
  assert.deepEqual(cleanerRegisterSchema.parse({ ...registration, serviceAreas: [] }).serviceAreas, []);
  assert.deepEqual(cleanerRegisterSchema.parse({ ...registration, serviceAreas: ["Auckland"] }).serviceAreas, ["Auckland"]);
});

test("simplified registration still validates credentials, consent and supplied regions", () => {
  for (const changes of [
    { confirmPassword: "DifferentPassword123" },
    { password: "weak", confirmPassword: "weak" },
    { acceptedTerms: false },
    { serviceAreas: ["Invalid region"] },
  ]) {
    assert.equal(cleanerRegisterSchema.safeParse({ ...registration, ...changes }).success, false);
  }
});

test("dashboard drafts can save contact details before region selection", () => {
  const draft = { companyName: registration.companyName, contactPerson: registration.name, phone: registration.phone, yearsOperating: "", serviceAreas: [] };
  assert.deepEqual(cleanerProfileSchema.parse(draft).serviceAreas, []);
  assert.deepEqual(cleanerProfileSchema.parse({ ...draft, serviceAreas: ["Auckland", "Waikato"] }).serviceAreas, ["Auckland", "Waikato"]);
  assert.equal(cleanerProfileSchema.safeParse({ ...draft, serviceAreas: ["Invalid region"] }).success, false);
});

test("going live requires both verified email and a valid saved region", () => {
  assert.match(getCleanerActivationError({ emailVerified: true, serviceAreas: [] }) ?? "", /service region/);
  assert.match(getCleanerActivationError({ emailVerified: true, serviceAreas: ["Invalid region"] }) ?? "", /service region/);
  assert.match(getCleanerActivationError({ emailVerified: false, serviceAreas: ["Auckland"] }) ?? "", /email/);
  assert.equal(getCleanerActivationError({ emailVerified: true, serviceAreas: ["Auckland"] }), null);
});

test("regions alone do not grant lead access and an active status cannot bypass missing regions", () => {
  for (const status of ["PENDING", "INACTIVE", "SUSPENDED", "DELETING"]) {
    assert.equal(canCleanerAccessLeads({ status, serviceAreas: ["Auckland"] }), false);
  }
  assert.equal(canCleanerAccessLeads({ status: "ACTIVE", serviceAreas: [] }), false);
  assert.equal(canCleanerAccessLeads({ status: "ACTIVE", serviceAreas: ["Invalid region"] }), false);
  assert.equal(canCleanerAccessLeads({ status: "ACTIVE", serviceAreas: ["Auckland"] }), true);
});
