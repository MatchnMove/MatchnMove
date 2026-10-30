import assert from "node:assert/strict";
import test from "node:test";
import { contactFollowUp, prospectContactSchema, validBusinessPhone } from "../lib/prospect-contacts";

test("public contact details require valid values; nonpublic details may be absent or obtained manually", () => {
  assert.equal(prospectContactSchema.safeParse({ emailAvailability: "PUBLIC", phoneAvailability: "PUBLIC" }).success, false);
  assert.equal(prospectContactSchema.safeParse({ email: "bad", phone: "abc", emailAvailability: "NOT_PUBLIC", phoneAvailability: "NOT_PUBLIC" }).success, false);
  assert.equal(prospectContactSchema.safeParse({ email: "", phone: "", emailAvailability: "NOT_PUBLIC", phoneAvailability: "NOT_PUBLIC" }).success, true);
  const recorded = prospectContactSchema.parse({ email: " Admin@Example.NZ ", phone: "+64 (21) 123-4567", emailAvailability: "NOT_PUBLIC", phoneAvailability: "NOT_PUBLIC" });
  assert.equal(recorded.email, "admin@example.nz");
  assert.equal(contactFollowUp(recorded).required, false);
  assert.equal(validBusinessPhone("123"), false);
  assert.equal(validBusinessPhone("+".repeat(8)), false);
});

test("follow-up requests phone contact only when a suitable phone is recorded", () => {
  assert.match(contactFollowUp({ phone: "0211234567" }).description, /Phone follow-up required/);
  assert.match(contactFollowUp({ email: "business@example.nz" }).description, /research required.*phone/);
  for (const phone of [null, "", "invalid", "123"]) {
    const result = contactFollowUp({ phone });
    assert.equal(result.missingEmail, true);
    assert.match(result.description, /Manual contact research required/);
    assert.doesNotMatch(result.description, /Phone follow-up/);
  }
  const legacy = prospectContactSchema.parse({ email: "existing@example.nz", phone: "" });
  assert.equal(legacy.emailAvailability, undefined);
  assert.equal(legacy.phoneAvailability, undefined);
  assert.equal(contactFollowUp(legacy).reviewRequired, true);
});
