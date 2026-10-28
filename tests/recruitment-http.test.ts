import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import { prisma } from "../lib/db";
import { createSessionToken } from "../lib/auth";
import { hashPassword } from "../lib/password";
import { secureToken, tokenHash } from "../lib/recruitment-policy";

const base = process.env.RECRUITMENT_TEST_BASE_URL;
test(
  "recruitment HTTP access controls and integrated rendering",
  { skip: !base, timeout: 180000 },
  async (t) => {
    assert.ok(["127.0.0.1", "localhost"].includes(new URL(base!).hostname));
    const database = new URL(
      process.env.RECRUITMENT_TEST_DATABASE_URL || "http://invalid",
    );
    assert.ok(["127.0.0.1", "localhost"].includes(database.hostname));
    assert.ok(database.pathname.endsWith("_test"));
    assert.equal(
      process.env.DATABASE_URL,
      process.env.RECRUITMENT_TEST_DATABASE_URL,
    );
    const tag = randomBytes(5).toString("hex");
    const passwordHash = await hashPassword(secureToken());
    const makeUser = (
      name: string,
      adminRole: "OWNER" | "RECRUITMENT_ADMIN" | null,
      role: "ADMIN" | "MOVER" = "ADMIN",
    ) =>
      prisma.user.create({
        data: {
          name,
          email: `${name}-${tag}@validation.invalid`,
          passwordHash,
          emailVerifiedAt: new Date(),
          role,
          adminRole,
          canViewRecruitmentLeads: true,
        },
      });
    const owner = await makeUser("Owner", "OWNER");
    const carli = await makeUser("Carli", "RECRUITMENT_ADMIN");
    const tiaan = await makeUser("Tiaan", "RECRUITMENT_ADMIN");
    const legacy = await makeUser("Legacy", null);
    const mover = await makeUser("Mover", null, "MOVER");
    const session = (user: typeof owner, mfaVerified = true) =>
      `mm_session=${createSessionToken({ userId: user.id, email: user.email, role: user.role, mfaVerified, sessionVersion: user.sessionVersion })}`;
    const get = (path: string, user?: typeof owner, mfa = true) =>
      fetch(`${base}${path}`, {
        headers: user ? { Cookie: session(user, mfa) } : {},
        redirect: "manual",
      });
    const post = (
      action: string,
      data: unknown,
      user = owner,
      origin = base!,
    ) =>
      fetch(`${base}/api/admin/recruitment`, {
        method: "POST",
        headers: {
          Origin: origin,
          Cookie: session(user),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, data }),
      });
    const createProspect = async (user: typeof owner, name: string) => {
      const response = await post(
        "save_prospect",
        {
          prospect: {
            companyName: `${name} ${tag}`,
            email: `${name}-${tag}@validation.invalid`,
            serviceAreas: ["Auckland"],
            serviceTypes: ["HOUSEHOLD"],
            consentBasis: "EXPRESS",
            consentEvidence: "Local test permission",
          },
        },
        user,
      );
      assert.equal(response.status, 200, await response.clone().text());
      return response.json() as Promise<{ id: string; version: number }>;
    };
    await t.test(
      "anonymous users, customer accounts and incomplete MFA cannot access recruitment data",
      async () => {
        for (const [user, mfa] of [
          [undefined, true],
          [mover, true],
          [carli, false],
        ] as const)
          assert.equal(
            (await get("/api/admin/recruitment?view=dashboard", user, mfa))
              .status,
            401,
          );
        const page = await get("/admin/recruitment");
        if (page.status === 200) {
          const html = await page.text();
          assert.ok(html.includes("/mover/login"));
          assert.equal(html.includes("Recruitment at a glance"), false);
        } else assert.equal(page.status, 307);
      },
    );
    await t.test(
      "owner and legacy admin retain access; recruiters receive role-aware server-rendered navigation",
      async () => {
        for (const user of [owner, legacy, carli, tiaan])
          assert.equal(
            (await get("/api/admin/recruitment?view=dashboard", user)).status,
            200,
          );
        const personal = await get("/admin/recruitment", carli);
        assert.equal(personal.status, 200);
        const html = await personal.text();
        assert.ok(html.includes("Carli"));
        assert.ok(html.includes("Company directory"));
        assert.ok(html.includes("Email station"));
        assert.equal(html.includes('id="microsoft-clarity"'), false);
        assert.equal(
          html.includes("https://www.googletagmanager.com/gtag/js"),
          false,
        );
        assert.equal(html.includes('href="/admin/recruitment/team"'), false);
        const ownerPage = await get("/admin/recruitment/team", owner);
        assert.equal(ownerPage.status, 200);
        assert.ok((await ownerPage.text()).includes("Team &amp; access"));
      },
    );
    const carliProspect = await createProspect(carli, "CarliCompany");
    const tiaanProspect = await createProspect(tiaan, "TiaanCompany");
    await t.test("email-only colleagues can prepare and review general invitations without lead access", async () => {
      const emailUser = await makeUser("EmailOnly", "RECRUITMENT_ADMIN");
      const emailOnly = await prisma.user.update({ where: { id: emailUser.id }, data: { canViewRecruitmentLeads: false } });
      const company = await createProspect(emailOnly, "EmailCompany");
      const result = await post("prepare_general", { prospectId: company.id }, emailOnly);
      assert.equal(result.status, 200, await result.clone().text());
      const draft = await result.json();
      assert.equal(draft.quoteRequestId, null);
      assert.equal(draft.text.includes("Moving date:"), false);
      const repeat = await post("prepare_general", { prospectId: company.id }, emailOnly);
      assert.equal((await repeat.json()).id, draft.id);
      const history = await get(`/api/admin/recruitment?view=messages&id=${draft.id}`, emailOnly);
      assert.equal(history.status, 200);
      assert.equal((await history.json())[0].id, draft.id);
      assert.equal((await get("/api/admin/recruitment?view=messages&kind=lead", emailOnly)).status, 403);
      assert.equal((await get("/api/admin/recruitment?view=email_station", emailOnly)).status, 200);
      assert.equal((await post("prepare_general", { prospectId: tiaanProspect.id }, emailOnly)).status, 404);
      assert.equal((await post("send", { id: draft.id, updatedAt: draft.updatedAt, confirmed: true }, emailOnly)).status, 403);
      assert.equal((await post("verify_sender", { confirmed: true }, emailOnly)).status, 403);
      const page = await get("/admin/recruitment/messages", emailOnly);
      const html = await page.text();
      assert.ok(html.includes("Email station"));
      assert.equal(html.includes('href="/admin/recruitment/leads"'), false);
    });
    await t.test(
      "cross-admin prospect, note and task access is denied at HTTP endpoints",
      async () => {
        assert.equal(
          (
            await get(
              `/api/admin/recruitment?view=prospect&id=${tiaanProspect.id}`,
              carli,
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await get(
              `/api/admin/recruitment?view=prospect&id=${carliProspect.id}`,
              tiaan,
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await get(
              `/api/admin/recruitment?view=prospect&id=${tiaanProspect.id}`,
              owner,
            )
          ).status,
          200,
        );
        for (const view of ["team", "settings"])
          assert.equal(
            (await get(`/api/admin/recruitment?view=${view}`, carli)).status,
            403,
          );
        assert.equal(
          (
            await post(
              "team_update",
              {
                id: carli.id,
                role: "OWNER",
                disabled: false,
                canSend: true,
                canViewLeads: true,
              },
              carli,
            )
          ).status,
          403,
        );
        assert.equal((await get("/api/admin/cleaners", carli)).status, 401);
        assert.equal(
          (await get("/api/admin/mover-verification", carli)).status,
          401,
        );
      },
    );
    await t.test(
      "reassignment immediately transfers records and pending tasks while invalidating stale ownership",
      async () => {
        const task = await post(
          "create_task",
          {
            title: "Review company coverage",
            prospectId: carliProspect.id,
            dueAt: new Date().toISOString(),
          },
          carli,
        );
        assert.equal(task.status, 200);
        const response = await post("reassign", {
          id: carliProspect.id,
          version: carliProspect.version,
          assignedAdminId: tiaan.id,
        });
        assert.equal(response.status, 200);
        assert.equal(
          (
            await get(
              `/api/admin/recruitment?view=prospect&id=${carliProspect.id}`,
              carli,
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await get(
              `/api/admin/recruitment?view=prospect&id=${carliProspect.id}`,
              tiaan,
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await prisma.recruitmentTask.findFirstOrThrow({
              where: { prospectId: carliProspect.id },
            })
          ).assignedAdminId,
          tiaan.id,
        );
        assert.equal(
          (
            await post("reassign", {
              id: carliProspect.id,
              version: carliProspect.version,
              assignedAdminId: carli.id,
            })
          ).status,
          409,
        );
      },
    );
    await t.test(
      "CSRF, disabled sessions and revoked lead permissions are enforced on the server",
      async () => {
        assert.equal(
          (
            await post(
              "invite",
              { name: "Unauthorised", email: "bad@validation.invalid" },
              owner,
              "https://attacker.invalid",
            )
          ).status,
          403,
        );
        const result = await post("team_update", {
          id: carli.id,
          role: "RECRUITMENT_ADMIN",
          disabled: true,
          canSend: false,
          canViewLeads: false,
        });
        assert.equal(result.status, 200);
        assert.equal(
          (await get("/api/admin/recruitment?view=dashboard", carli)).status,
          401,
        );
        const revoke = await post("team_update", {
          id: tiaan.id,
          role: "RECRUITMENT_ADMIN",
          disabled: false,
          canSend: false,
          canViewLeads: false,
        });
        assert.equal(revoke.status, 200);
        const refreshedTiaan = await prisma.user.findUniqueOrThrow({
          where: { id: tiaan.id },
        });
        assert.equal(
          (await get("/api/admin/recruitment?view=leads", refreshedTiaan))
            .status,
          403,
        );
        assert.equal(
          (await get("/api/admin/recruitment?view=dashboard", tiaan)).status,
          401,
        );
      },
    );
    await t.test(
      "unsigned email event webhooks and unapproved send requests cannot trigger delivery",
      async () => {
        const event = await fetch(`${base}/api/recruitment/provider-events`, {
          method: "POST",
          body: JSON.stringify({
            eventId: "invalid",
            email: "test@validation.invalid",
            type: "COMPLAINT",
          }),
        });
        assert.ok([401, 503].includes(event.status));
        const send = await post("send", {
          id: "no-such-message",
          confirmed: false,
          updatedAt: new Date().toISOString(),
        });
        assert.equal(send.status, 400);
        const cron = await fetch(`${base}/api/recruitment/process`, {
          method: "POST",
        });
        assert.equal(cron.status, 401);
      },
    );
    await t.test(
      "public unsubscribe links remain usable without login and do not mutate on GET",
      async () => {
        const token = secureToken();
        const quote = await prisma.quoteRequest.create({
          data: {
            name: "Customer",
            email: "private@validation.invalid",
            phone: "0210000000",
            fromAddress: "1 Private Street",
            fromCity: "Auckland",
            fromRegion: "Auckland",
            fromPostcode: "1010",
            fromCountry: "NZ",
            toAddress: "2 Private Street",
            toCity: "Hamilton",
            toRegion: "Waikato",
            toPostcode: "3200",
            toCountry: "NZ",
            bedrooms: "3",
            fromPropertyType: "House",
            toPropertyType: "House",
          },
        });
        await prisma.outreachMessage.create({
          data: {
            prospectId: tiaanProspect.id,
            quoteRequestId: quote.id,
            adminId: tiaan.id,
            subject: "Validation",
            text: "Validation",
            html: "<p>Validation</p>",
            introduction: "Validation",
            attributionHash: tokenHash(secureToken()),
            attributionExpiresAt: new Date(),
            unsubscribeHash: tokenHash(token),
          },
        });
        const response = await get(`/recruitment/unsubscribe?token=${token}`);
        assert.equal(response.status, 200);
        assert.ok((await response.text()).includes("Unsubscribe"));
        assert.equal(
          await prisma.contactSuppression.findUnique({
            where: {
              email: `TiaanCompany-${tag}@validation.invalid`.toLowerCase(),
            },
          }),
          null,
        );
      },
    );
    t.after(() => prisma.$disconnect());
  },
);
