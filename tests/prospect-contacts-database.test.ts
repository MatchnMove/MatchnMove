import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { prisma } from "../lib/db";
import { locked, ownedProspect, prepareDraft, saveProspect, setProspectStatus } from "../lib/recruitment";
import { contactFollowUp } from "../lib/prospect-contacts";
import { createSessionToken } from "../lib/auth";

const database = process.env.CONTACT_TEST_DATABASE_URL;
test("contact pipeline persists missing details, preserves legacy records and never sends on save", { skip: !database }, async t => {
  const url = new URL(database!);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
  assert.ok(url.pathname.endsWith("_test"));
  assert.equal(process.env.DATABASE_URL, database);
  t.after(() => prisma.$disconnect());
  const tag = randomUUID();
  const phone = `021${tag.replace(/\D/g, "").slice(0, 8).padEnd(8, "0")}`;
  const user = await prisma.user.create({ data: { email: `contact-admin-${tag}@validation.invalid`, passwordHash: "unused-local-test", role: "ADMIN", adminRole: "RECRUITMENT_ADMIN" } });
  const actor = { id: user.id, role: "RECRUITMENT_ADMIN" as const, canSend: false, canViewLeads: false };
  const quoteCount = await prisma.quoteRequest.count();
  const deliveryCount = await prisma.emailDelivery.count();
  const base = { companyName: `No contacts ${tag}`, emailAvailability: "NOT_PUBLIC", phoneAvailability: "NOT_PUBLIC" };
  await assert.rejects(locked(tx => saveProspect(tx, actor, { companyName: "Missing choices" })), /Business email availability/);
  await assert.rejects(locked(tx => saveProspect(tx, actor, { ...base, phoneAvailability: null })), /Phone number availability/);
  await assert.rejects(locked(tx => saveProspect(tx, actor, { ...base, emailAvailability: "PUBLIC" })), /required when Publicly/);
  let prospect = await locked(tx => saveProspect(tx, actor, base));
  const second = await locked(tx => saveProspect(tx, actor, { ...base, companyName: `Other no contacts ${tag}` }));
  assert.notEqual(second.id, prospect.id); // Multiple absent emails are not duplicates.
  assert.equal(prospect.email, null);
  assert.equal(prospect.consentBasis, "UNKNOWN");
  let task = await prisma.recruitmentTask.findUniqueOrThrow({ where: { dedupeKey: `contact-info:${prospect.id}` } });
  assert.match(task.description!, /Manual contact research/);
  assert.doesNotMatch(task.description!, /Phone follow-up/);
  await assert.rejects(locked(tx => prepareDraft(tx, actor, prospect.id)), /email is missing/);
  await assert.rejects(locked(tx => ownedProspect(tx, { ...actor, id: "another-admin" }, prospect.id)), /not found/);
  prospect = await locked(tx => saveProspect(tx, actor, { ...base, phone }, prospect.id, prospect.version));
  task = await prisma.recruitmentTask.findUniqueOrThrow({ where: { id: task.id } });
  assert.match(task.description!, /Phone follow-up/);
  assert.equal(task.completedAt, null);
  prospect = await locked(tx => saveProspect(tx, actor, { ...base, phone, email: `obtained-${tag}@validation.invalid` }, prospect.id, prospect.version));
  assert.equal(prospect.emailAvailability, "NOT_PUBLIC"); // Obtained manually, not relabelled public.
  assert.equal(contactFollowUp(prospect).missingEmail, false);
  assert.equal((await prisma.recruitmentTask.findUniqueOrThrow({ where: { id: task.id } })).completedAt instanceof Date, true);
  await assert.rejects(locked(tx => prepareDraft(tx, actor, prospect.id)), /reviewed contact permission/);
  await assert.rejects(locked(tx => saveProspect(tx, actor, { ...base, email: prospect.email }, prospect.id, 0)), /changed/);
  const legacy = await prisma.moverProspect.create({ data: { companyName: `Legacy ${tag}`, normalizedName: `legacy${tag}`, email: `legacy-${tag}@validation.invalid`, phone: phone.replace(/^021/, "029"), assignedAdminId: actor.id, serviceAreas: [], serviceTypes: [] } });
  const savedLegacy = await locked(tx => saveProspect(tx, actor, { companyName: legacy.companyName, email: legacy.email, notes: "Notes updated" }, legacy.id, legacy.version));
  assert.equal(savedLegacy.email, legacy.email);
  assert.equal(savedLegacy.phone, legacy.phone);
  assert.equal(savedLegacy.emailAvailability, null);
  assert.equal(savedLegacy.phoneAvailability, null);
  assert.equal(await prisma.recruitmentTask.count({ where: { dedupeKey: `contact-info:${legacy.id}` } }), 0);
  await locked(tx => setProspectStatus(tx, actor, second.id, "DO_NOT_CONTACT", second.version));
  assert.equal((await prisma.moverProspect.findUniqueOrThrow({ where: { id: second.id } })).status, "DO_NOT_CONTACT");
  assert.equal(await prisma.emailDelivery.count(), deliveryCount);
  assert.equal(await prisma.quoteRequest.count(), quoteCount);

  if (process.env.CONTACT_TEST_BASE_URL) await t.test("HTTP filters, validation and task completion use the assigned admin scope", async () => {
    const baseUrl = process.env.CONTACT_TEST_BASE_URL!;
    assert.ok(["localhost", "127.0.0.1"].includes(new URL(baseUrl).hostname));
    const cookie = `mm_session=${createSessionToken({ userId: user.id, email: user.email, role: user.role, mfaVerified: true, sessionVersion: user.sessionVersion })}`;
    const post = (action: string, data: unknown) => fetch(`${baseUrl}/api/admin/recruitment`, { method: "POST", headers: { Cookie: cookie, Origin: baseUrl, "Content-Type": "application/json" }, body: JSON.stringify({ action, data }) });
    const invalid = await post("save_prospect", { prospect: { companyName: "Missing choices" } });
    assert.equal(invalid.status, 400);
    assert.match((await invalid.json()).error, /availability/);
    const created = await post("save_prospect", { prospect: { ...base, companyName: `HTTP contacts ${tag}` } });
    assert.equal(created.status, 200, await created.clone().text());
    const company = await created.json();
    const contactTask = await prisma.recruitmentTask.findUniqueOrThrow({ where: { dedupeKey: `contact-info:${company.id}` } });
    const premature = await post("complete_task", { id: contactTask.id });
    assert.equal(premature.status, 400);
    assert.match((await premature.json()).error, /valid business email and phone/);
    for (const filter of ["email", "phone", "followup"]) {
      const response = await fetch(`${baseUrl}/api/admin/recruitment?view=prospects&contact=${filter}`, { headers: { Cookie: cookie } });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.ok(data.items.some((item: { id: string }) => item.id === company.id));
      assert.ok(!data.items.some((item: { id: string }) => item.id === prospect.id));
      assert.ok(data.items.every((item: { assignedAdminId: string }) => item.assignedAdminId === actor.id));
    }
    const update = await post("save_prospect", { id: company.id, version: company.version, prospect: { ...base, companyName: company.companyName, email: `http-${tag}@validation.invalid`, phone: phone.replace(/^021/, "022") } });
    assert.equal(update.status, 200, await update.clone().text());
    assert.ok((await prisma.recruitmentTask.findUniqueOrThrow({ where: { id: contactTask.id } })).completedAt);
    const complete = await post("complete_task", { id: contactTask.id });
    assert.equal(complete.status, 200);
    const draft = await post("prepare_general", { prospectId: company.id });
    assert.equal(draft.status, 400);
    assert.match((await draft.json()).error, /contact permission/);
    const review = await fetch(`${baseUrl}/api/admin/recruitment?view=prospects&contact=review`, { headers: { Cookie: cookie } });
    assert.ok((await review.json()).items.some((item: { id: string }) => item.id === legacy.id));
    assert.equal(await prisma.emailDelivery.count(), deliveryCount);
    assert.equal(await prisma.quoteRequest.count(), quoteCount);
  });

  await t.test("migration retains existing values and leaves availability unreviewed", async () => {
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe('CREATE TEMP TABLE "MoverProspect" (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, phone TEXT) ON COMMIT DROP');
      await tx.$executeRawUnsafe('INSERT INTO "MoverProspect" VALUES (\'legacy\', \'existing@example.nz\', NULL)');
      const sql = readFileSync("prisma/migrations/20261031000000_prospect_contact_availability/migration.sql", "utf8");
      for (const statement of sql.split(";").filter(value => value.trim())) await tx.$executeRawUnsafe(statement);
      const rows = await tx.$queryRawUnsafe<Array<{ email: string; emailAvailability: string | null; phoneAvailability: string | null }>>('SELECT * FROM "MoverProspect"');
      assert.equal(rows[0].email, "existing@example.nz");
      assert.equal(rows[0].emailAvailability, null);
      assert.equal(rows[0].phoneAvailability, null);
      await tx.$executeRawUnsafe('INSERT INTO "MoverProspect" (id) VALUES (\'missing1\'), (\'missing2\')');
      await tx.$executeRawUnsafe("SAVEPOINT invalid_availability");
      await assert.rejects(tx.$executeRawUnsafe('UPDATE "MoverProspect" SET "emailAvailability" = \'UNKNOWN_VALUE\''));
      await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT invalid_availability");
    });
  });
});
