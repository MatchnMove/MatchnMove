import assert from "node:assert/strict";
import test from "node:test";
import { partnerAuthReturnPath } from "../lib/partner-auth-navigation";

test("stepped auth preserves assigned dashboard and admin destinations without open redirects", () => {
  assert.equal(partnerAuthReturnPath("mover", "/mover/dashboard?tab=leads&lead=test", true), "/mover/dashboard?tab=leads&lead=test");
  assert.equal(partnerAuthReturnPath("mover", "/admin/accept-invitation?token=fixture", false), "/admin/accept-invitation?token=fixture");
  assert.equal(partnerAuthReturnPath("cleaner", "/cleaner/dashboard?tab=billing", false), "/cleaner/dashboard?tab=billing");
  for (const unsafe of ["https://elsewhere.invalid", "//elsewhere.invalid", "/\\elsewhere.invalid", "/mover/dashboard/../../", "/mover/dashboard\r\n", "/", "/cleaner/dashboard", "/admin/leads"]) {
    assert.equal(partnerAuthReturnPath("mover", unsafe, true), "/mover/dashboard");
  }
  assert.equal(partnerAuthReturnPath("cleaner", "/admin/leads", false), "/cleaner/dashboard");
});
