import assert from "node:assert/strict";
import test from "node:test";
import { isPrivateWorkspacePath } from "../lib/analytics-privacy";
import { isRecruitmentMutationRequest } from "../lib/recruitment-request";
import { isAdminUser, isAnyAdminUser } from "../lib/admin-auth";
import {
  aucklandMidnight,
  recruitmentDateRange,
} from "../lib/recruitment-dates";
import {
  contactBlockReason,
  defaultIntroduction,
  matchProspect,
  mayAccessProspect,
  normalizeCompany,
  normalizeEmail,
  renderRecruitmentEmail,
  safeLeadSummary,
  scopeProspects,
  secureToken,
  tokenHash,
} from "../lib/recruitment-policy";

const carli = {
  id: "carli",
  role: "RECRUITMENT_ADMIN" as const,
  canSend: false,
  canViewLeads: true,
};
const owner = { ...carli, id: "owner", role: "OWNER" as const };
const customer = {
  id: "quote",
  fromRegion: "Auckland",
  toRegion: "Waikato",
  moveDate: new Date("2026-12-15T00:00:00Z"),
  dateFlexible: false,
  bedrooms: "3",
  fromPropertyType: "House",
  createdAt: new Date(),
  name: "Private Customer",
  email: "private@example.com",
  phone: "0215555555",
  fromAddress: "22 Private Street",
  toAddress: "30 Secret Road",
  movingWhat: "Phone 0215555555",
  transcriptRaw: { secret: "private" },
};

test("recruiters cannot enter legacy owner tools, even if allowlisted", () => {
  process.env.MOVER_ADMIN_EMAILS = "owner@example.com,carli@example.com";
  const user = {
    id: "carli",
    email: "carli@example.com",
    role: "ADMIN",
    adminRole: "RECRUITMENT_ADMIN",
  };
  assert.equal(isAdminUser(user), false);
  assert.equal(isAnyAdminUser(user), true);
  assert.equal(isAdminUser({ ...user, adminRole: "OWNER" }), true);
  assert.equal(isAdminUser({ ...user, adminRole: null }), true);
  assert.equal(isAnyAdminUser({ ...user, adminDisabledAt: new Date() }), false);
  assert.equal(
    isAdminUser({ id: "owner", email: "owner@example.com", role: "MOVER" }),
    true,
  );
  delete process.env.MOVER_ADMIN_EMAILS;
});
test("ownership scopes prevent cross-admin access in both directions", () => {
  assert.deepEqual(scopeProspects(carli), { assignedAdminId: "carli" });
  assert.equal(mayAccessProspect(carli, { assignedAdminId: "tiaan" }), false);
  assert.equal(
    mayAccessProspect({ ...carli, id: "tiaan" }, { assignedAdminId: "carli" }),
    false,
  );
  assert.equal(mayAccessProspect(owner, { assignedAdminId: "tiaan" }), true);
});
test("normalisation catches company spelling separators and email casing", () => {
  assert.equal(
    normalizeCompany(" Acme Moving, Ltd. "),
    normalizeCompany("ACME MOVING LTD"),
  );
  assert.equal(normalizeEmail(" Carli@Example.com "), "carli@example.com");
});
test("summaries and rendered invitations exclude all customer PII and arbitrary free-form fields", () => {
  const lead = safeLeadSummary(customer);
  const email = renderRecruitmentEmail({
    companyName: "A & B <Movers>",
    introduction: defaultIntroduction,
    lead,
    registrationUrl: "https://example.com/register",
    unsubscribeUrl: "https://example.com/unsubscribe",
    sender: "Match 'n Move",
  });
  const output = JSON.stringify({ lead, email });
  for (const secret of [
    customer.name,
    customer.email,
    customer.phone,
    customer.fromAddress,
    customer.toAddress,
    "transcriptRaw",
    "movingWhat",
  ])
    assert.equal(output.includes(secret), false);
  assert.ok(email.html.includes("A &amp; B &lt;Movers&gt;"));
  assert.ok(email.text.includes("not reserved or guaranteed"));
  assert.ok(email.html.includes("Unsubscribe"));
  assert.ok(email.text.includes("Customer contact details"));
});
test("summary fields cannot smuggle private data through region or property inputs", () => {
  const lead = safeLeadSummary({
    ...customer,
    fromRegion: customer.fromAddress,
    bedrooms: customer.phone,
    fromPropertyType: customer.name,
  });
  assert.equal(lead.origin, "Region requires review");
  assert.equal(lead.bedrooms, "Size requires review");
  assert.equal(lead.property, "Property requires review");
});
test("unknown consent, closed recruitment and suppressions block sending", () => {
  const prospect = {
    status: "CONTACTED",
    consentBasis: "EXPRESS",
    consentEvidence: "Written opt-in recorded",
  };
  assert.equal(contactBlockReason(prospect, false), null);
  for (const status of [
    "REGISTERED",
    "ACTIVE_MOVER",
    "NOT_INTERESTED",
    "DO_NOT_CONTACT",
  ])
    assert.ok(contactBlockReason({ ...prospect, status }, false));
  assert.ok(contactBlockReason(prospect, true));
  assert.ok(
    contactBlockReason({ ...prospect, consentBasis: "UNKNOWN" }, false),
  );
  assert.ok(contactBlockReason({ ...prospect, consentEvidence: "" }, false));
});
test("matching explains known coverage and flags unknown coverage", () => {
  const lead = safeLeadSummary(customer);
  const match = matchProspect(
    {
      operatingRegion: "Auckland",
      serviceAreas: ["Waikato"],
      serviceTypes: ["HOUSEHOLD"],
      longDistance: true,
    },
    lead,
  );
  assert.equal(match.score, 100);
  assert.equal(match.requiresReview, false);
  assert.equal(match.reasons.length, 4);
  assert.equal(
    matchProspect(
      {
        operatingRegion: null,
        serviceAreas: [],
        serviceTypes: [],
        longDistance: false,
      },
      lead,
    ).requiresReview,
    true,
  );
});
test("attribution tokens are random and stored as irreversible hashes", () => {
  const first = secureToken();
  const second = secureToken();
  assert.equal(first.length, 43);
  assert.notEqual(first, second);
  assert.equal(tokenHash(first).length, 64);
  assert.notEqual(tokenHash(first), first);
});
test("report dates follow Auckland days, including daylight saving transitions", () => {
  assert.equal(
    aucklandMidnight("2026-07-01").toISOString(),
    "2026-06-30T12:00:00.000Z",
  );
  assert.equal(
    aucklandMidnight("2026-12-01").toISOString(),
    "2026-11-30T11:00:00.000Z",
  );
  const spring = recruitmentDateRange("custom", "2026-09-27", "2026-09-27");
  assert.equal(spring.start, "2026-09-26T12:00:00.000Z");
  assert.equal(spring.end, "2026-09-27T10:59:59.999Z");
  const today = recruitmentDateRange(
    "1",
    "",
    "",
    new Date("2026-10-23T20:00:00Z"),
  );
  assert.equal(today.start, "2026-10-23T11:00:00.000Z");
  assert.equal(today.end, "2026-10-24T10:59:59.999Z");
  assert.throws(() => aucklandMidnight("2026-02-31"));
});

test("recruitment mutations require JSON and the public browser origin behind a proxy", () => {
  const request = {
    headers: new Headers({
      origin: "https://www.matchnmove.co.nz",
      "x-forwarded-host": "www.matchnmove.co.nz",
      "x-forwarded-proto": "https",
      "content-type": "application/json",
    }),
    nextUrl: { protocol: "http:" },
  };
  assert.equal(isRecruitmentMutationRequest(request), true);
  request.headers.set("origin", "https://attacker.invalid");
  assert.equal(isRecruitmentMutationRequest(request), false);
  request.headers.set("origin", "https://www.matchnmove.co.nz");
  request.headers.set("content-type", "text/plain");
  assert.equal(isRecruitmentMutationRequest(request), false);
});

test("analytics are excluded from private workspaces and token-bearing account pages", () => {
  for (const path of [
    "/admin/recruitment",
    "/admin/accept-invitation",
    "/recruitment/unsubscribe",
    "/mover/reset-password",
    "/cleaner/dashboard",
    "/review/invitation",
  ])
    assert.equal(isPrivateWorkspacePath(path), true);
  for (const path of [
    "/",
    "/quote",
    "/movers",
    "/moving-quotes/auckland",
    "/resources",
  ])
    assert.equal(isPrivateWorkspacePath(path), false);
});
