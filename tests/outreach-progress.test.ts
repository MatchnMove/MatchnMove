import assert from "node:assert/strict";
import test from "node:test";
import { companyEmailProgress } from "../lib/outreach-progress";

test("progress uses actual successful sends and distinguishes drafts, uncertainty and paused sequences", () => {
  const sentAt = new Date("2026-11-01T21:00:00Z"), nextDueAt = new Date("2026-11-08T21:00:00Z");
  const sent = { sequence: 0, status: "SENT", sentAt };
  assert.equal(companyEmailProgress([]).stage, "Not started");
  assert.equal(companyEmailProgress([{ sequence: 0, status: "DISCARDED", sentAt: null }]).stage, "Not started");
  const pending = companyEmailProgress([sent, { sequence: 1, status: "DRAFT", sentAt: null }], nextDueAt, "ACTIVE");
  assert.equal(pending.stage, "Invitation sent");
  assert.equal(pending.next, "First follow-up draft ready");
  assert.equal(pending.lastSentAt, sentAt);
  assert.equal(companyEmailProgress([sent], nextDueAt, "PAUSED").nextDueAt, null);
  assert.equal(companyEmailProgress([sent, { sequence: 1, status: "NEEDS_REVIEW", sentAt: null }]).stage, "Delivery needs review");
  assert.equal(companyEmailProgress([{ sequence: 1, status: "RETRY", sentAt: null }]).next, "First follow-up awaiting retry");
  // A new campaign's first email can be newer than an earlier sequence's final.
  assert.equal(companyEmailProgress([{ sequence: 3, status: "SENT", sentAt: "2026-09-01" }, sent]).stage, "Invitation sent");
});
