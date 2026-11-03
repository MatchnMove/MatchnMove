import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { JSDOM } from "jsdom";
import { MOVER_TEMPLATE_VERSION, moverGreeting, moverTemplateKeys, cleanerTemplateKeys, renderMoverOutreachEmail } from "../lib/mover-outreach-templates";
import { addAucklandCalendar, aucklandParts } from "../lib/recruitment-dates";
import { classifyOutreachFailure, explicitReplyOptOut, mailboxAutomationBlock, nextOutreachDate, opportunityEligible } from "../lib/mover-outreach-campaigns";
import { safeLeadSummary } from "../lib/recruitment-policy";

const lead = safeLeadSummary({ id: "quote", fromRegion: "Auckland", toRegion: "Waikato", moveDate: new Date("2027-01-20T00:00:00Z"), dateFlexible: true, bedrooms: "3", fromPropertyType: "House", createdAt: new Date() });
const input = { companyName: "Example Movers", contactName: "Alex", registrationUrl: "https://www.matchnmove.co.nz/api/recruitment/attribution?token=test", unsubscribeUrl: "https://www.matchnmove.co.nz/recruitment/unsubscribe?token=test", lead };

test("all six approved subjects, populated bodies, links and shared signatures render without placeholders", () => {
  const subjects = ["Invitation to join the Match 'n Move mover network", "Invitation to join the Match 'n Move mover network", "Following up on your Match 'n Move invitation", "Checking in | Match 'n Move mover network", "Final follow-up | Match 'n Move invitation", "Reconnecting with Example Movers | Match 'n Move"];
  moverTemplateKeys.forEach((templateKey, index) => {
    const result = renderMoverOutreachEmail({ ...input, templateKey });
    assert.equal(result.subject, subjects[index]);
    assert.ok(result.text.startsWith("Hi Alex from Example Movers,"));
    assert.doesNotMatch(result.text + result.html + result.subject, /\[Company Name\]|\[Person Name\]|{{|logo integrated|null|undefined/);
    for (const text of ["+64 21 958 000 (Seth)", "+64 210 872 1208 (Tiaan)", "contact@matchnmove.co.nz", "Plan the move. Book with confidence."]) assert.ok(result.text.includes(text));
    const dom = new JSDOM(result.html);
    assert.equal(dom.window.document.querySelector('img[alt="Match \'n Move logo"]')?.getAttribute("src"), "https://www.matchnmove.co.nz/logo-mark.png");
    for (const href of ["tel:+6421958000", "tel:+642108721208", "mailto:contact@matchnmove.co.nz", "https://www.matchnmove.co.nz/mover/pricing", input.registrationUrl, input.unsubscribeUrl]) assert.ok([...dom.window.document.querySelectorAll("a")].some(link => link.getAttribute("href") === href), href);
    assert.equal(dom.window.document.querySelectorAll("script,iframe,form").length, 0);
    if (index !== 1) assert.doesNotMatch(result.text, /Preferred moving date|Moving from:|Moving to:|may be relevant to Example Movers, based on/);
    dom.window.close();
  });
  assert.ok(existsSync("public/logo-mark.png"));
  assert.equal(MOVER_TEMPLATE_VERSION, "2026-11-03.v2");
});

test("personalisation escapes markup and missing people use the approved team greeting", () => {
  for (const contactName of [null, undefined, "", " ", "undefined", "null", "[Person Name]"]) assert.equal(moverGreeting("Example Movers", contactName), "Hi Example Movers team,");
  const result = renderMoverOutreachEmail({ ...input, templateKey: "MOVER_GENERAL", companyName: '<script>alert("x")</script> & Co', contactName: "<img onerror='bad'>", personalNote: "<b>Private adjustment</b>" });
  assert.doesNotMatch(result.html, /<script>|onerror='bad'|<b>Private adjustment/);
  assert.match(result.html, /&lt;script&gt;/);
  assert.equal(new JSDOM(result.html).window.document.querySelectorAll("img").length, 2);
  assert.throws(() => moverGreeting("undefined"), /company name is required/);
});

test("all six cleaner emails use the shared design and cleaning copy, pricing and registration", () => {
  for (const templateKey of cleanerTemplateKeys) {
    const email = renderMoverOutreachEmail({ ...input, companyName: "Example Cleaners", templateKey, lead: null });
    assert.match(email.text, /cleaning/i);
    assert.doesNotMatch(email.text + email.html + email.subject, /moving companies|moving services|mover network|\/mover\/|Moving from:|Moving to:|Preferred moving date|\[Company Name\]|{{/);
    assert.match(email.text, /https:\/\/www.matchnmove.co.nz\/cleaner\/partner/);
    assert.match(email.text, /Register: https:\/\/www.matchnmove.co.nz\/api\/recruitment\/attribution/);
    const dom = new JSDOM(email.html);
    assert.ok(dom.window.document.querySelector("h1"));
    assert.equal(dom.window.document.querySelector(".signature-details strong")?.textContent, "The Match 'n Move Team");
    assert.ok(dom.window.document.querySelector('a[href="mailto:contact@matchnmove.co.nz"]'));
    assert.ok(dom.window.document.querySelector(`a[href="${input.unsubscribeUrl}"]`));
    assert.match(dom.window.document.querySelector("style")!.textContent!, /max-width:480px/);
    dom.window.close();
  }
  assert.throws(() => renderMoverOutreachEmail({ ...input, templateKey: "CLEANER_OPPORTUNITY" }), /moving summary cannot/);
  const opportunity = renderMoverOutreachEmail({ ...input, templateKey: "CLEANER_OPPORTUNITY", lead: null });
  assert.doesNotMatch(opportunity.text, /we have a cleaning opportunity|received a cleaning request|following details/i);
});

test("opportunity rendering rejects missing approval and omits unapproved or missing details", () => {
  assert.throws(() => renderMoverOutreachEmail({ ...input, templateKey: "MOVER_OPPORTUNITY", lead: null }), /authorised moving summary/);
  const result = renderMoverOutreachEmail({ ...input, templateKey: "MOVER_OPPORTUNITY", lead: { ...lead, origin: "21 Private Street", destination: "customer@example.com", bedrooms: "0211234567", property: "Customer private note", moveDate: "Date not provided" } });
  assert.doesNotMatch(result.text + result.html, /21 Private Street|customer@example|0211234567|Customer private note|Date not provided|Additional requirements:/);
  assert.match(result.text, /not reserved or guaranteed/);
  const good = renderMoverOutreachEmail({ ...input, templateKey: "MOVER_OPPORTUNITY" });
  assert.match(good.text, /Moving from: Auckland/);
  assert.match(good.text, /Preferred moving date: 2027-01-20 \(flexible\)/);
  assert.match(good.text, /Property size: 3 \/ House/);
});

test("outreach calendar handles Auckland DST, weekends, short and leap months", () => {
  const initial = new Date("2026-09-20T21:15:00Z"); // Monday 09:15 NZST
  const first = nextOutreachDate(0, initial)!;
  assert.equal(first.toISOString(), "2026-09-27T20:15:00.000Z"); // Monday 09:15 NZDT
  assert.equal(aucklandParts(first).hour, 9);
  const second = nextOutreachDate(1, first)!;
  assert.equal(second.toISOString(), "2026-10-18T20:15:00.000Z");
  assert.equal(nextOutreachDate(2, second)!.toISOString(), "2026-11-18T20:15:00.000Z");
  assert.equal(nextOutreachDate(3, second), null);
  assert.equal(addAucklandCalendar(new Date("2026-01-30T21:00:00Z"), { months: 1 }).toISOString(), "2026-02-27T21:00:00.000Z");
  assert.equal(addAucklandCalendar(new Date("2028-01-30T21:00:00Z"), { months: 1 }).toISOString(), "2028-02-28T21:00:00.000Z");
  assert.equal(addAucklandCalendar(new Date("2026-09-25T14:30:00Z"), { days: 1 }).toISOString(), "2026-09-26T14:30:00.000Z");
  assert.equal(aucklandParts(addAucklandCalendar(initial, { months: 3 })).month, 12);
});

test("automation requires a current monitored inbox and never treats a stale sync as silence", () => {
  assert.match(mailboxAutomationBlock(null)!, /Connect the monitored/);
  const mailbox = { address: "support@matchnmove.co.nz", encryptedRefreshToken: "fixture", initialSyncComplete: true, lastSyncedAt: new Date(), lastError: null };
  assert.equal(mailboxAutomationBlock(mailbox), null);
  assert.match(mailboxAutomationBlock({ ...mailbox, lastSyncedAt: new Date(Date.now() - 180000) })!, /Reply status is unknown/);
  assert.match(mailboxAutomationBlock({ ...mailbox, lastError: "offline" })!, /successful, current inbox sync/);
  assert.match(mailboxAutomationBlock({ ...mailbox, initialPageToken: "pending-page" })!, /all pending reply pages/);
});

test("explicit reply opt-outs are recognised without treating quoted unsubscribe footers as requests", () => {
  for (const text of ["Please unsubscribe us", "Do not contact me again.", "Please remove us from your mailing list.", "Unsubscribe"]) assert.equal(explicitReplyOptOut(text), true);
  assert.equal(explicitReplyOptOut("Please send details.\n\nOn Monday, Team wrote:\nUnsubscribe\nPlease unsubscribe us"), false);
  assert.equal(explicitReplyOptOut("Can we register?\n> Unsubscribe\n> Please unsubscribe us"), false);
});

test("only definitive non-acceptance can retry; permanent and ambiguous outcomes stop or need review", () => {
  assert.equal(classifyOutreachFailure({ responseCode: 451 }), "RETRYABLE");
  assert.equal(classifyOutreachFailure({ code: "ECONNREFUSED" }), "RETRYABLE");
  assert.equal(classifyOutreachFailure({ responseCode: 550 }), "PERMANENT");
  assert.equal(classifyOutreachFailure({ code: "ETIMEDOUT", command: "DATA" }), "UNCERTAIN");
  assert.equal(classifyOutreachFailure(new Error("unknown")), "UNCERTAIN");
  assert.equal(opportunityEligible({ moveDate: new Date("2020-01-01"), createdAt: new Date() }), false);
  assert.equal(opportunityEligible({ moveDate: null, createdAt: new Date(Date.now() - 40 * 86400000) }), false);
});
