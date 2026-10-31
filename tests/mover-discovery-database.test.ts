import "next/dist/server/node-environment-baseline";
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { createRequestStoreForAPI } from "next/dist/server/async-storage/request-store";
import {
  workAsyncStorage,
  type WorkStore,
} from "next/dist/server/app-render/work-async-storage.external";
import { workUnitAsyncStorage } from "next/dist/server/app-render/work-unit-async-storage.external";
import { prisma } from "../lib/db";
import { createSessionToken } from "../lib/auth";
import { normalizeCompany } from "../lib/recruitment-policy";
import { GET, POST } from "../app/api/admin/recruitment/discovery/route";
import { POST as save } from "../app/api/admin/recruitment/route";
const database = process.env.DISCOVERY_TEST_DATABASE_URL;
test(
  "NZBN and SerpApi discovery permissions, duplicate privacy and CRM integration",
  { skip: !database, timeout: 120000 },
  async (t) => {
    const db = new URL(database!);
    assert.ok(["127.0.0.1", "localhost"].includes(db.hostname));
    assert.ok(db.pathname.endsWith("_test"));
    assert.equal(process.env.DATABASE_URL, database);
    const tag = randomUUID();
    const previousFetch = globalThis.fetch;
    const previousKey = process.env.NZBN_API_SUBSCRIPTION_KEY;
    const previousBase = process.env.NZBN_API_BASE_URL;
    const previousWebKey = process.env.SERPAPI_API_KEY;
    const previousLimit = process.env.MOVER_DISCOVERY_DAILY_LIMIT;
    process.env.SERPAPI_API_KEY = "web-fixture-only-key";
    process.env.MOVER_DISCOVERY_DAILY_LIMIT = "100";
    process.env.NZBN_API_SUBSCRIPTION_KEY = "fixture-only-key";
    process.env.NZBN_API_BASE_URL =
      "https://api.business.govt.nz/gateway/nzbn/v5";
    let calls = 0;
    const entries = [
      {
        nzbn: "9429041752715",
        entityName: "Discovery Existing " + tag,
        entityStatusDescription: "Registered",
      },
      {
        nzbn: "9429000106078",
        entityName: "Discovery Registered " + tag,
        entityStatusDescription: "Registered",
      },
      {
        nzbn: "9429036975273",
        entityName: "Discovery New " + tag,
        entityStatusDescription: "Registered",
        emailAddresses: [
          { emailAddress: "new-" + tag + "@validation.invalid" },
        ],
        websites: [{ url: "https://new-" + tag + ".invalid/" }],
        phoneNumbers: [{ phoneNumber: "0211111111" }],
      },
    ];
    const webEntries = [
      { place_id: "ChIJ_existing", title: entries[0].entityName },
      { place_id: "ChIJ_registered", title: entries[1].entityName },
      {
        place_id: "ChIJ_new",
        title: "Web Mover " + tag,
        website: "https://web-" + tag + ".invalid",
        phone: "0212222222",
        type: "Moving company",
      },
    ];
    globalThis.fetch = async (input, init) => {
      calls++;
      const url = new URL(String(input));
      if (url.origin === "https://serpapi.com") {
        assert.equal(url.searchParams.get("api_key"), "web-fixture-only-key");
        const id = url.searchParams.get("place_id");
        return id
          ? Response.json({
              place_results: webEntries.find((e) => e.place_id === id),
            })
          : Response.json({ local_results: webEntries });
      }
      assert.equal(url.origin, "https://api.business.govt.nz");
      assert.equal(
        new Headers(init?.headers).get("Ocp-Apim-Subscription-Key"),
        "fixture-only-key",
      );
      if (url.pathname.endsWith("/entities"))
        return Response.json({ items: entries });
      const entity = entries.find((e) => url.pathname.endsWith("/" + e.nzbn));
      return entity
        ? Response.json(entity)
        : new Response(null, { status: 404 });
    };
    const makeUser = (
      name: string,
      adminRole: "OWNER" | "RECRUITMENT_ADMIN" | null,
      role: "ADMIN" | "MOVER" = "ADMIN",
    ) =>
      prisma.user.create({
        data: {
          name,
          email: name + "-" + tag + "@validation.invalid",
          passwordHash: "unused-validation-password",
          role,
          adminRole,
          emailVerifiedAt: new Date(),
        },
      });
    const owner = await makeUser("Owner", "OWNER");
    const a = await makeUser("RecruiterA", "RECRUITMENT_ADMIN");
    const b = await makeUser("RecruiterB", "RECRUITMENT_ADMIN");
    const ordinary = await makeUser("Ordinary", null, "MOVER");
    const old = await prisma.moverProspect.create({
      data: {
        companyName: entries[0].entityName,
        normalizedName: normalizeCompany(entries[0].entityName),
        email: "private-prospect-" + tag + "@validation.invalid",
        assignedAdminId: a.id,
        serviceAreas: [],
        serviceTypes: [],
        notes: "Other admin private notes",
      },
    });
    await prisma.moverCompany.create({
      data: {
        userId: ordinary.id,
        companyName: entries[1].entityName,
        nzbn: entries[1].nzbn,
        serviceAreas: ["Auckland"],
      },
    });
    const emptyNzbnMover = await makeUser("EmptyNzbnMover", null, "MOVER");
    await prisma.moverCompany.create({
      data: {
        userId: emptyNzbnMover.id,
        companyName: "Other business " + tag,
        nzbn: "",
        serviceAreas: [],
      },
    });
    const token = (u: typeof a, mfaVerified = true) =>
      "mm_session=" +
      createSessionToken({
        userId: u.id,
        email: u.email,
        role: u.role,
        mfaVerified,
        sessionVersion: u.sessionVersion,
      });
    async function invoke(
      handler: (r: NextRequest) => Promise<Response>,
      body?: unknown,
      cookie = "",
      origin = "https://app.validation.invalid",
    ) {
      const req = new NextRequest(
        "https://app.validation.invalid/api/admin/recruitment/discovery",
        {
          method: body === undefined ? "GET" : "POST",
          headers: {
            host: "app.validation.invalid",
            origin,
            cookie,
            "content-type": "application/json",
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        },
      );
      const request = createRequestStoreForAPI(
        req,
        { pathname: req.nextUrl.pathname },
        { tags: [], expirationsByCacheKind: new Map() },
        undefined,
        undefined,
        undefined,
      );
      const work = {
        route: req.nextUrl.pathname,
        page: req.nextUrl.pathname + "/route",
        isStaticGeneration: false,
        incrementalCache: {},
        cacheLifeProfiles: { max: { expire: 3600 } },
      } as unknown as WorkStore;
      return workAsyncStorage.run(work, () =>
        workUnitAsyncStorage.run(request, () => handler(req)),
      );
    }
    try {
      await t.test(
        "paid discovery denies unauthenticated, missing-MFA and cross-origin requests before provider use",
        async () => {
          const before = calls;
          const body = {
            action: "maps_search",
            query: "movers",
            city: "Auckland",
            page: 1,
          };
          for (const cookie of ["", token(ordinary), token(b, false)])
            assert.equal((await invoke(POST, body, cookie)).status, 401);
          assert.equal(
            (await invoke(POST, body, token(b), "https://unrelated.invalid"))
              .status,
            403,
          );
          assert.equal(calls, before);
        },
      );
      await t.test(
        "anonymous, ordinary mover, incomplete MFA and foreign-origin requests cannot use the registry key",
        async () => {
          const before = calls;
          for (const cookie of ["", token(ordinary), token(a, false)]) {
            assert.equal(
              (await invoke(() => GET(), undefined, cookie)).status,
              401,
            );
            assert.equal(
              (
                await invoke(
                  POST,
                  { action: "search", query: "movers", page: 1 },
                  cookie,
                )
              ).status,
              401,
            );
          }
          assert.equal(
            (
              await invoke(
                POST,
                { action: "search", query: "movers" },
                token(a),
                "https://unrelated.invalid",
              )
            ).status,
            403,
          );
          assert.equal(calls, before);
        },
      );
      await t.test(
        "setup state is clear, authenticated and never discloses credentials",
        async () => {
          delete process.env.NZBN_API_SUBSCRIPTION_KEY;
          const state = await invoke(() => GET(), undefined, token(a));
          assert.equal(state.status, 200);
          assert.equal((await state.json()).configured, false);
          const blocked = await invoke(
            POST,
            { action: "search", query: "movers", page: 1 },
            token(a),
          );
          assert.equal(blocked.status, 503);
          assert.equal((await blocked.json()).code, "SETUP_REQUIRED");
          process.env.NZBN_API_SUBSCRIPTION_KEY = "fixture-only-key";
        },
      );
      await t.test(
        "duplicate results never reveal another recruiter's record or notes",
        async () => {
          const response = await invoke(
            POST,
            { action: "search", query: "movers", page: 1 },
            token(b),
          );
          assert.equal(response.status, 200, await response.clone().text());
          const data = await response.json();
          assert.equal(data.items[0].match.duplicate, true);
          assert.equal(data.items[0].match.existingId, null);
          assert.equal(data.items[1].match.registered, true);
          assert.doesNotMatch(
            JSON.stringify(data),
            /Other admin private notes|private-prospect|fixture-only-key/,
          );
          for (const actor of [a, owner]) {
            const own = await invoke(
              POST,
              { action: "search", query: "movers", page: 1 },
              token(actor),
            );
            assert.equal((await own.json()).items[0].match.existingId, old.id);
          }
          assert.equal(
            await prisma.adminAuditLog.count({
              where: { actorId: b.id, action: "mover_discovery_search" },
            }),
            1,
          );
        },
      );
      await t.test(
        "review fills the normal CRM form with no inferred permission and no account or email creation",
        async () => {
          const usersBefore = await prisma.user.count();
          const messagesBefore = await prisma.outreachMessage.count();
          const emailsBefore = await prisma.emailDelivery.count();
          const details = await invoke(
            POST,
            { action: "details", nzbn: entries[2].nzbn },
            token(b),
          );
          assert.equal(details.status, 200, await details.clone().text());
          const data = await details.json();
          assert.equal(data.item.match.duplicate, false);
          assert.equal(
            data.prefill.email,
            entries[2].emailAddresses![0].emailAddress,
          );
          assert.equal(data.prefill.consentBasis, "UNKNOWN");
          assert.deepEqual(data.prefill.serviceAreas, []);
          assert.deepEqual(data.prefill.serviceTypes, []);
          const added = await invoke(
            save,
            {
              action: "save_prospect",
              data: { prospect: { ...data.prefill, emailAvailability: "PUBLIC", phoneAvailability: data.prefill.phone ? "PUBLIC" : "NOT_PUBLIC", operatingRegion: null } },
            },
            token(b),
          );
          assert.equal(added.status, 200, await added.clone().text());
          const prospect = await added.json();
          assert.equal(prospect.assignedAdminId, b.id);
          assert.equal(prospect.status, "NOT_CONTACTED");
          assert.equal(prospect.consentBasis, "UNKNOWN");
          assert.match(prospect.notes, /NZBN: 9429036975273/);
          assert.equal(await prisma.user.count(), usersBefore);
          assert.equal(await prisma.outreachMessage.count(), messagesBefore);
          assert.equal(await prisma.emailDelivery.count(), emailsBefore);
          const repeat = await invoke(
            POST,
            { action: "details", nzbn: entries[2].nzbn },
            token(a),
          );
          assert.equal((await repeat.json()).item.match.existingId, null);
          const duplicate = await invoke(
            save,
            {
              action: "save_prospect",
              data: { prospect: { ...data.prefill, emailAvailability: "PUBLIC", phoneAvailability: data.prefill.phone ? "PUBLIC" : "NOT_PUBLIC", operatingRegion: null } },
            },
            token(a),
          );
          assert.equal(duplicate.status, 409);
        },
      );
      await t.test(
        "persistent suppressions are recognised before a discovered company can be selected",
        async () => {
          await prisma.contactSuppression.create({
            data: {
              email: entries[2].emailAddresses![0].emailAddress,
              reason: "Validation suppression",
              source: "test",
            },
          });
          const response = await invoke(
            POST,
            { action: "details", nzbn: entries[2].nzbn },
            token(b),
          );
          assert.equal(response.status, 200);
          assert.equal((await response.json()).item.match.suppressed, true);
        },
      );
      await t.test(
        "SerpApi works without NZBN, preserves duplicate privacy and requires manual email review before save",
        async () => {
          delete process.env.NZBN_API_SUBSCRIPTION_KEY;
          const response = await invoke(
            POST,
            {
              action: "maps_search",
              query: "movers",
              city: "Auckland",
              page: 1,
            },
            token(b),
          );
          assert.equal(response.status, 200, await response.clone().text());
          const result = await response.json();
          assert.equal(result.items[0].match.duplicate, true);
          assert.equal(result.items[0].match.existingId, null);
          assert.equal(result.items[1].match.registered, true);
          assert.equal(
            result.items[2].match.registered,
            false,
            "empty NZBNs must not match registered movers",
          );
          assert.doesNotMatch(
            JSON.stringify(result),
            /web-fixture-only-key|private-prospect|Other admin private notes/,
          );
          const usersBefore = await prisma.user.count();
          const messagesBefore = await prisma.outreachMessage.count();
          const emailsBefore = await prisma.emailDelivery.count();
          const details = await invoke(
            POST,
            { action: "maps_details", placeId: "ChIJ_new" },
            token(b),
          );
          assert.equal(details.status, 200, await details.clone().text());
          const data = await details.json();
          assert.equal(data.prefill.email, "");
          assert.equal(data.prefill.consentBasis, "UNKNOWN");
          assert.deepEqual(data.prefill.serviceAreas, []);
          assert.match(data.prefill.notes, /SerpApi/);
          const invalid = await invoke(
            save,
            {
              action: "save_prospect",
              data: { prospect: { ...data.prefill, operatingRegion: null } },
            },
            token(b),
          );
          assert.equal(invalid.status, 400);
          const saved = await invoke(
            save,
            {
              action: "save_prospect",
              data: {
                prospect: {
                  ...data.prefill,
                  email: "web-" + tag + "@validation.invalid",
                  emailAvailability: "PUBLIC",
                  phoneAvailability: data.prefill.phone ? "PUBLIC" : "NOT_PUBLIC",
                  operatingRegion: null,
                },
              },
            },
            token(b),
          );
          assert.equal(saved.status, 200, await saved.clone().text());
          assert.equal((await saved.json()).assignedAdminId, b.id);
          const repeat = await invoke(
            POST,
            { action: "maps_details", placeId: "ChIJ_new" },
            token(owner),
          );
          assert.equal((await repeat.json()).item.match.duplicate, true);
          assert.equal(await prisma.user.count(), usersBefore);
          assert.equal(await prisma.outreachMessage.count(), messagesBefore);
          assert.equal(await prisma.emailDelivery.count(), emailsBefore);
          process.env.NZBN_API_SUBSCRIPTION_KEY = "fixture-only-key";
        },
      );
      await t.test(
        "a missing SerpApi key is actionable and consumes no paid request reservation",
        async () => {
          delete process.env.SERPAPI_API_KEY;
          const before = calls;
          const count = await prisma.adminAuditLog.count({
            where: { action: "mover_discovery_web_request" },
          });
          const response = await invoke(
            POST,
            { action: "maps_search", query: "movers", city: "Auckland" },
            token(owner),
          );
          assert.equal(response.status, 503);
          assert.equal((await response.json()).code, "SETUP_REQUIRED");
          assert.equal(calls, before);
          assert.equal(
            await prisma.adminAuditLog.count({
              where: { action: "mover_discovery_web_request" },
            }),
            count,
          );
          process.env.SERPAPI_API_KEY = "web-fixture-only-key";
        },
      );
      await t.test(
        "concurrent admins share a persistent request cap checked before any paid call",
        async () => {
          const used = await prisma.adminAuditLog.count({
            where: {
              action: "mover_discovery_web_request",
              createdAt: { gte: new Date(Date.now() - 86400000) },
            },
          });
          process.env.MOVER_DISCOVERY_DAILY_LIMIT = String(used + 1);
          const before = calls;
          const responses = await Promise.all(
            [owner, a].map((u) =>
              invoke(
                POST,
                { action: "maps_search", query: "movers", city: "Dunedin" },
                token(u),
              ),
            ),
          );
          assert.deepEqual(responses.map((r) => r.status).sort(), [200, 429]);
          const capped = responses.find((r) => r.status === 429)!;
          assert.equal((await capped.json()).code, "DAILY_LIMIT");
          assert.equal(calls, before + 1);
          process.env.MOVER_DISCOVERY_DAILY_LIMIT = "100";
        },
      );
      await t.test(
        "disabled administrators cannot perform discovery even with an earlier session",
        async () => {
          const cookie = token(a);
          await prisma.user.update({
            where: { id: a.id },
            data: {
              adminDisabledAt: new Date(),
              sessionVersion: { increment: 1 },
            },
          });
          const before = calls;
          assert.equal(
            (
              await invoke(
                POST,
                { action: "search", query: "movers", page: 1 },
                cookie,
              )
            ).status,
            401,
          );
          assert.equal(calls, before);
          assert.equal(
            (
              await invoke(
                POST,
                { action: "maps_search", query: "movers", city: "Auckland" },
                cookie,
              )
            ).status,
            401,
          );
          assert.equal(calls, before);
        },
      );
    } finally {
      globalThis.fetch = previousFetch;
      if (previousKey === undefined)
        delete process.env.NZBN_API_SUBSCRIPTION_KEY;
      else process.env.NZBN_API_SUBSCRIPTION_KEY = previousKey;
      if (previousBase === undefined) delete process.env.NZBN_API_BASE_URL;
      else process.env.NZBN_API_BASE_URL = previousBase;
      if (previousWebKey === undefined) delete process.env.SERPAPI_API_KEY;
      else process.env.SERPAPI_API_KEY = previousWebKey;
      if (previousLimit === undefined)
        delete process.env.MOVER_DISCOVERY_DAILY_LIMIT;
      else process.env.MOVER_DISCOVERY_DAILY_LIMIT = previousLimit;
      await prisma.$disconnect();
    }
  },
);
