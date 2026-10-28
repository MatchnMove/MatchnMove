import assert from "node:assert/strict";
import test from "node:test";
import { adminNavigationFor, currentAdminSection } from "../lib/admin-navigation";
import { defaultGeneralIntroduction, renderRecruitmentEmail } from "../lib/recruitment-policy";

test("colleagues without lead access can reach the email station but not owner tools", () => {
  const actor = { role: "RECRUITMENT_ADMIN" as const, canViewLeads: false };
  const links = adminNavigationFor(actor).flatMap(group => group.items);
  assert.ok(links.some(link => link.href === "/admin/recruitment/messages"));
  assert.equal(links.some(link => link.href.endsWith("/leads")), false);
  assert.equal(links.some(link => link.href.endsWith("/team")), false);
  assert.equal(links.some(link => link.href.endsWith("/settings")), false);
  assert.equal(currentAdminSection("/admin/recruitment/messages", actor)?.label, "Email station");
  assert.equal(currentAdminSection("/admin/verification", actor), undefined);
});

test("owner navigation has one current section across recruitment and platform operations", () => {
  const actor = { role: "OWNER" as const, canViewLeads: true };
  assert.equal(currentAdminSection("/admin/recruitment/prospects", actor)?.label, "Company directory");
  assert.equal(currentAdminSection("/admin/recruitment/dashboard", actor)?.label, "Overview");
  assert.equal(currentAdminSection("/admin/quote-flow", actor)?.label, "Quotes & registered movers");
  const urls = adminNavigationFor(actor).flatMap(group => group.items.map(item => item.href));
  assert.equal(new Set(urls).size, urls.length);
});

test("general invitations render without a lead, escape company text and retain registration and opt-out", () => {
  const result = renderRecruitmentEmail({
    companyName: 'Example <script>alert("x")</script> Movers',
    introduction: defaultGeneralIntroduction,
    lead: null,
    registrationUrl: "https://example.invalid/register?token=test",
    unsubscribeUrl: "https://example.invalid/unsubscribe?token=test",
    sender: "Match 'n Move · support@example.invalid",
  });
  assert.equal(result.subject, "An invitation to join Match 'n Move");
  assert.equal(result.html.includes("<script>"), false);
  assert.ok(result.html.includes("&lt;script&gt;"));
  assert.ok(result.text.includes("not an offer of a specific moving job"));
  assert.equal(result.text.includes("Moving date:"), false);
  assert.ok(result.text.includes("Register: https://example.invalid/register?token=test"));
  assert.ok(result.text.includes("Unsubscribe: https://example.invalid/unsubscribe?token=test"));
});
