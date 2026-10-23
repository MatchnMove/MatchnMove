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
const database = process.env.TRUST_TEST_DATABASE_URL;
test(
  "trust and planning API integration on disposable PostgreSQL only",
  { skip: !database, timeout: 120000 },
  async (t) => {
    const url = new URL(database!);
    assert.ok(["127.0.0.1", "localhost"].includes(url.hostname));
    assert.ok(url.pathname.endsWith("_test"));
    assert.equal(process.env.DATABASE_URL, database);
    process.env.SMTP_HOST = "";
    process.env.SMTP_PORT = "0";
    process.env.SMTP_USER = "";
    process.env.SMTP_PASS = "";
    process.env.STRIPE_SECRET_KEY = "";
    assert.equal(process.env.SMTP_HOST, "");
    assert.equal(process.env.STRIPE_SECRET_KEY, "");
    const base = "http://127.0.0.1:3014";
    assert.equal(process.env.NEXT_PUBLIC_APP_URL, base);
    assert.equal(
      await prisma.moverCompany.count({ where: { status: "ACTIVE" } }),
      0,
      "Use a fresh disposable database without active providers.",
    );
    assert.equal(
      await prisma.cleanerCompany.count({ where: { status: "ACTIVE" } }),
      0,
      "Use a fresh disposable database without active providers.",
    );
    const tag = randomUUID();
    async function call(
      path: string,
      handler: (r: NextRequest) => Promise<Response>,
      body?: unknown,
      cookie = "",
      origin = base,
    ) {
      const req = new NextRequest(base + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Origin: origin,
          Cookie: cookie,
          "Content-Type": "application/json",
          "x-real-ip": "trust-validation-" + tag,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const store = createRequestStoreForAPI(
        req,
        { pathname: req.nextUrl.pathname, search: req.nextUrl.search },
        { tags: [], expirationsByCacheKind: new Map() },
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
      const response = await workAsyncStorage.run(work, () =>
        workUnitAsyncStorage.run(store, () => handler(req)),
      );
      return {
        response,
        cookies: store.mutableCookies
          .getAll()
          .map((c) => c.name + "=" + c.value)
          .join("; "),
      };
    }
    const user = async (
      name: string,
      role: "MOVER" | "CLEANER" | "ADMIN",
      adminRole?: "OWNER" | "RECRUITMENT_ADMIN",
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
    const owner = await user("Owner", "ADMIN", "OWNER");
    const recruiter = await user("Recruiter", "ADMIN", "RECRUITMENT_ADMIN");
    const moverUser = await user("Mover", "MOVER");
    const cleanerAUser = await user("CleanerA", "CLEANER");
    const cleanerWUser = await user("CleanerW", "CLEANER");
    const session = (u: typeof owner, mfaVerified = true) =>
      "mm_session=" +
      createSessionToken({
        userId: u.id,
        email: u.email,
        role: u.role,
        mfaVerified,
        sessionVersion: u.sessionVersion,
      });
    const mover = await prisma.moverCompany.create({
      data: {
        userId: moverUser.id,
        companyName: "Trust validation mover",
        serviceAreas: ["Auckland", "Waikato"],
        status: "ACTIVE",
      },
    });
    const makeCleaner = (userId: string, area: string) =>
      prisma.cleanerCompany.create({
        data: {
          userId,
          companyName: "Trust validation " + area,
          contactPerson: "Cleaner",
          phone: "0211111111",
          serviceAreas: [area],
          status: "ACTIVE",
        },
      });
    const cleanerA = await makeCleaner(cleanerAUser.id, "Auckland");
    const cleanerW = await makeCleaner(cleanerWUser.id, "Waikato");
    const draft = await import("../app/api/quote-draft/route");
    const submit = await import("../app/api/quote-requests/route");
    const customer = await import("../app/api/customer-request/route");
    const access = await import("../app/request/access/route");
    const cleanerLeads = await import("../app/api/cleaner/leads/route");
    const unlock = await import("../app/api/cleaner/leads/[id]/unlock/route");
    const invoice = await import(
      "../app/api/cleaner/billing/invoices/[invoiceId]/route"
    );
    const admin = await import("../app/api/admin/trust/route");
    const reports = await import("../app/api/reviews/report/route");
    const responses = await import("../app/api/mover/review-response/route");
    const telemetry = await import("../app/api/conversion-events/route");
    const details = {
      name: "Private Customer",
      email: "customer-" + tag + "@validation.invalid",
      phone: "0219999999",
      fromAddress: "12 Private Pickup Road",
      fromCity: "Albany",
      fromRegion: "Auckland",
      fromPostcode: "0632",
      fromCountry: "New Zealand",
      fromPropertyType: "House",
      bedrooms: "3",
      toAddress: "88 Private Destination Road",
      toCity: "Hamilton",
      toRegion: "Waikato",
      toPostcode: "3204",
      toCountry: "New Zealand",
      toPropertyType: "Apartment",
      toBedrooms: "2",
      dateFlexible: true,
      sharingConsent: true,
      recruitmentSharingAllowed: false,
      inventory: [
        {
          id: "custom-safe",
          label: "Private heavy safe",
          room: "Other",
          quantity: 1,
          notes: "Lifting equipment needed",
        },
      ],
    };
    try {
      await t.test(
        "encrypted draft round-trip, isolation, expiry and clearing",
        async () => {
          const saved = await call("/api/quote-draft", draft.POST, {
            form: {
              name: "",
              email: "",
              fromAddress: details.fromAddress,
              dateFlexible: true,
            },
            step: 2,
            inventory: details.inventory,
            calculator: {
              routeType: "inter-island",
              homeSize: "three",
              city: "other",
              packing: true,
              difficultAccess: false,
              heavyItem: true,
              busyTiming: false,
            },
          });
          assert.equal(
            saved.response.status,
            200,
            await saved.response.clone().text(),
          );
          assert.match(saved.cookies, /mm_quote_draft=/);
          const record = await prisma.quoteDraft.findFirstOrThrow({
            orderBy: { updatedAt: "desc" },
          });
          assert.doesNotMatch(record.encryptedData, /Private|Pickup|Road/);
          assert.doesNotMatch(record.tokenHash, /mm_quote_draft/);
          const read = await call(
            "/api/quote-draft",
            () => draft.GET(),
            undefined,
            saved.cookies,
          );
          const data = await read.response.json();
          assert.equal(data.draft.form.fromAddress, details.fromAddress);
          assert.equal(data.draft.calculator.homeSize, "three");
          assert.equal(data.draft.inventory[0].label, "Private heavy safe");
          assert.equal(
            (
              await (
                await call("/api/quote-draft", () => draft.GET())
              ).response.json()
            ).draft,
            null,
          );
          const cross = await call(
            "/api/quote-draft",
            draft.POST,
            { step: 1 },
            saved.cookies,
            "https://unrelated.invalid",
          );
          assert.equal(cross.response.status, 403);
          await prisma.quoteDraft.update({
            where: { id: record.id },
            data: { expiresAt: new Date(0) },
          });
          assert.equal(
            (
              await (
                await call(
                  "/api/quote-draft",
                  () => draft.GET(),
                  undefined,
                  saved.cookies,
                )
              ).response.json()
            ).draft,
            null,
          );
          const again = await call("/api/quote-draft", draft.POST, {
            inventory: details.inventory,
          });
          assert.equal(again.response.status, 200);
          const cleared = await call(
            "/api/quote-draft",
            draft.DELETE,
            {},
            again.cookies,
          );
          assert.equal(cleared.response.status, 200);
          assert.equal(
            (
              await (
                await call(
                  "/api/quote-draft",
                  () => draft.GET(),
                  undefined,
                  again.cookies,
                )
              ).response.json()
            ).draft,
            null,
          );
        },
      );
      let quoteId = "",
        customerCookie = "",
        cleanerLeadId = "",
        movingLeadId = "";
      await t.test(
        "quote creates correct moving and move-in cleaning records with private access",
        async () => {
          const result = await call("/api/quote-requests", submit.POST, {
            ...details,
            clientRequestId: tag,
            cleaningSelected: true,
            cleaningNotes: "Private cleaning notes",
            cleaningDetails: {
              location: "MOVE_IN",
              destinationConsent: true,
              services: ["MOVE_IN", "OVEN", "CARPET"],
              carpetRooms: 2,
              preferredDate: "2026-11-10",
              timeWindow: "MORNING",
              propertyEmpty: "YES",
              moverTiming: "BEFORE",
              accessNotes: "Private access notes",
            },
          });
          assert.equal(
            result.response.status,
            200,
            await result.response.clone().text(),
          );
          customerCookie = result.cookies;
          assert.match(customerCookie, /mm_request_access=/);
          const data = await result.response.json();
          quoteId = data.id;
          assert.equal(data.distributedTo, 1);
          assert.equal(data.cleaningDistributedTo, 1);
          const record = await prisma.quoteRequest.findUniqueOrThrow({
            where: { id: quoteId },
            include: {
              leads: true,
              cleaningRequest: { include: { leads: true } },
            },
          });
          assert.equal(record.leads[0].moverCompanyId, mover.id);
          movingLeadId = record.leads[0].id;
          assert.equal(record.cleaningRequest?.location, "MOVE_IN");
          assert.equal(
            record.cleaningRequest?.targetAddress,
            details.toAddress,
          );
          assert.ok(record.cleaningRequest?.destinationConsentAt);
          assert.equal(
            record.cleaningRequest?.leads[0].cleanerCompanyId,
            cleanerW.id,
          );
          cleanerLeadId = record.cleaningRequest!.leads[0].id;
          assert.equal(record.cleaningRequest?.leads[0].price, 1500);
          assert.equal(
            (record.inventory as { label: string }[])[0].label,
            "Private heavy safe",
          );
          const retry = await call("/api/quote-requests", submit.POST, {
            ...details,
            clientRequestId: tag,
            cleaningSelected: false,
            toAddress: "Changed destination",
          });
          assert.equal(retry.response.status, 200);
          assert.equal((await retry.response.json()).id, quoteId);
          assert.equal(
            await prisma.lead.count({ where: { quoteRequestId: quoteId } }),
            1,
          );
          assert.equal(
            await prisma.cleaningLead.count({
              where: { cleaningRequest: { quoteRequestId: quoteId } },
            }),
            1,
          );
          assert.equal(
            (
              await prisma.cleaningRequest.findUniqueOrThrow({
                where: { quoteRequestId: quoteId },
              })
            ).targetAddress,
            details.toAddress,
          );
        },
      );
      await t.test(
        "cleaner access is scoped, paid once and cannot reveal the other property",
        async () => {
          const locked = await call(
            "/api/cleaner/leads",
            cleanerLeads.GET,
            undefined,
            session(cleanerWUser),
          );
          assert.equal(locked.response.status, 200);
          const preview = await locked.response.json();
          const item = preview.find(
            (v: { id: string }) => v.id === cleanerLeadId,
          );
          assert.equal(item.customer, null);
          assert.equal(item.cleaning.generalLocation, "Hamilton, Waikato");
          assert.doesNotMatch(
            JSON.stringify(item),
            /Private Pickup|Private Destination|Private Customer|Private access|Private heavy safe|customer-/,
          );
          const unrelated = await call(
            "/api/cleaner/leads/" + cleanerLeadId + "/unlock",
            (r) =>
              unlock.POST(r, {
                params: Promise.resolve({ id: cleanerLeadId }),
              }),
            {},
            session(cleanerAUser),
          );
          assert.equal(unrelated.response.status, 404);
          for (let attempt = 0; attempt < 2; attempt++) {
            const opened = await call(
              "/api/cleaner/leads/" + cleanerLeadId + "/unlock",
              (r) =>
                unlock.POST(r, {
                  params: Promise.resolve({ id: cleanerLeadId }),
                }),
              {},
              session(cleanerWUser),
            );
            assert.equal(
              opened.response.status,
              200,
              await opened.response.clone().text(),
            );
            const data = await opened.response.json();
            assert.equal(data.lead.customer.address, details.toAddress);
            assert.equal(data.charge.amount, 1500);
            assert.doesNotMatch(
              JSON.stringify(data.lead),
              /Private Pickup|0632|Private heavy safe/,
            );
          }
          assert.equal(
            await prisma.cleaningLeadPurchase.count({
              where: { cleaningLeadId: cleanerLeadId },
            }),
            1,
          );
          const charge = await prisma.cleaningLeadPurchase.findUniqueOrThrow({
            where: { cleaningLeadId: cleanerLeadId },
            include: { invoice: true },
          });
          assert.equal(charge.invoice.total, 1500);
          assert.equal(charge.invoice.leadCount, 1);
          const view = await call(
            "/api/cleaner/billing/invoices/" + charge.invoiceId,
            (r) =>
              invoice.GET(r, {
                params: Promise.resolve({ invoiceId: charge.invoiceId }),
              }),
            undefined,
            session(cleanerWUser),
          );
          assert.equal(view.response.status, 200);
          assert.equal(
            (await view.response.json()).purchases[0].generalLocation,
            "Hamilton, Waikato",
          );
          await prisma.cleanerCompany.update({
            where: { id: cleanerW.id },
            data: { status: "INACTIVE" },
          });
          const suspended = await call(
            "/api/cleaner/leads",
            cleanerLeads.GET,
            undefined,
            session(cleanerWUser),
          );
          const hidden = (await suspended.response.json()).find(
            (v: { id: string }) => v.id === cleanerLeadId,
          );
          assert.equal(hidden.customer, null);
          assert.equal(hidden.cleaning.accessNotes, null);
          await prisma.cleanerCompany.update({
            where: { id: cleanerW.id },
            data: { status: "ACTIVE" },
          });
        },
      );
      await t.test(
        "moving-only and move-out requests preserve optionality and use pickup coverage",
        async () => {
          const moving = await call("/api/quote-requests", submit.POST, {
            ...details,
            clientRequestId: randomUUID(),
            cleaningSelected: false,
          });
          assert.equal(moving.response.status, 200);
          const q = await moving.response.json();
          assert.equal(
            await prisma.cleaningRequest.count({
              where: { quoteRequestId: q.id },
            }),
            0,
          );
          const out = await call("/api/quote-requests", submit.POST, {
            ...details,
            clientRequestId: randomUUID(),
            cleaningSelected: true,
            cleaningDetails: {
              location: "MOVE_OUT",
              services: ["END_OF_TENANCY"],
            },
          });
          assert.equal(out.response.status, 200);
          const o = await out.response.json();
          const record = await prisma.cleaningRequest.findUniqueOrThrow({
            where: { quoteRequestId: o.id },
            include: { leads: true },
          });
          assert.equal(record.targetAddress, details.fromAddress);
          assert.equal(record.destinationConsentAt, null);
          assert.equal(record.leads[0].cleanerCompanyId, cleanerA.id);
        },
      );
      await t.test(
        "customer corrections and private return links require possession, never a predictable ID",
        async () => {
          const denied = await call("/api/customer-request", customer.POST, {
            action: "support",
            message: "Change my moving date please.",
          });
          assert.equal(denied.response.status, 401);
          const saved = await call(
            "/api/customer-request",
            customer.POST,
            {
              action: "support",
              message: "Please review my moving date and cleaning time.",
            },
            customerCookie,
          );
          assert.equal(saved.response.status, 200);
          assert.equal(
            await prisma.customerRequestSupport.count({
              where: { quoteRequestId: quoteId },
            }),
            1,
          );
          const link = await call(
            "/api/customer-request",
            customer.POST,
            { action: "access" },
            customerCookie,
          );
          const data = await link.response.json();
          const target = new URL(data.url);
          assert.equal(target.pathname, "/request/access");
          assert.match(
            target.searchParams.get("token")!,
            /^[A-Za-z0-9_-]{43}$/,
          );
          const opened = await access.GET(new NextRequest(data.url));
          assert.equal(opened.status, 303);
          assert.match(opened.headers.get("set-cookie")!, /HttpOnly/i);
          assert.match(opened.headers.get("location")!, /\/request$/);
          assert.equal(opened.headers.get("referrer-policy"), "no-referrer");
          const guess = await access.GET(
            new NextRequest(base + "/request/access?token=" + quoteId),
          );
          assert.equal(guess.status, 404);
        },
      );
      let reviewId = "";
      await t.test(
        "reviews, reporting and responses retain ownership and moderation audits",
        async () => {
          const review = await prisma.review.create({
            data: {
              moverCompanyId: mover.id,
              leadId: movingLeadId,
              overallRating: 4,
              writtenReview: "Genuine validation review.",
              moderationStatus: "APPROVED",
              isPublic: true,
            },
          });
          reviewId = review.id;
          const report = await call("/api/reviews/report", reports.POST, {
            reviewId,
            reason: "Please review this factual statement.",
          });
          assert.equal(report.response.status, 200);
          const forbidden = await call(
            "/api/mover/review-response",
            responses.POST,
            { reviewId, response: "Thank you for your detailed feedback." },
            session(cleanerAUser),
          );
          assert.equal(forbidden.response.status, 401);
          const response = await call(
            "/api/mover/review-response",
            responses.POST,
            {
              reviewId,
              response:
                "Thank you for your detailed feedback. We will follow up.",
            },
            session(moverUser),
          );
          assert.equal(response.response.status, 200);
          assert.equal(
            (await prisma.review.findUniqueOrThrow({ where: { id: reviewId } }))
              .responseApprovedAt,
            null,
          );
          for (const cookie of ["", session(recruiter), session(owner, false)])
            assert.equal(
              (await call("/api/admin/trust", admin.GET, undefined, cookie))
                .response.status,
              403,
            );
          const approved = await call(
            "/api/admin/trust",
            admin.POST,
            {
              action: "response",
              id: reviewId,
              approve: true,
              note: "Reviewed the company response for private information.",
            },
            session(owner),
          );
          assert.equal(
            approved.response.status,
            200,
            await approved.response.clone().text(),
          );
          const moderation = await call(
            "/api/admin/trust",
            admin.POST,
            {
              action: "review",
              id: reviewId,
              status: "REJECTED",
              note: "Validation moderation decision for the audit test.",
            },
            session(owner),
          );
          assert.equal(moderation.response.status, 200);
          assert.equal(
            (
              await prisma.moverCompany.findUniqueOrThrow({
                where: { id: mover.id },
              })
            ).totalReviewCount,
            0,
          );
          assert.equal(
            await prisma.adminAuditLog.count({
              where: { actorId: owner.id, action: "trust_review_updated" },
            }),
            1,
          );
          const controls = await call(
            "/api/admin/trust",
            admin.GET,
            undefined,
            session(owner),
          );
          assert.equal(controls.response.status, 200);
          const dashboard = await controls.response.json();
          assert.ok(dashboard.metrics.quotes >= 3);
          assert.ok(
            dashboard.movers.some(
              (m: { id: string; completeness: { missing: string[] } }) =>
                m.id === mover.id &&
                m.completeness.missing.includes("Moving services"),
            ),
          );
        },
      );
      await t.test(
        "bounded analytics reject PII and duplicate event IDs without storing URLs",
        async () => {
          const id = randomUUID();
          const invalid = await call("/api/conversion-events", telemetry.POST, {
            id,
            name: "quote_form_started",
            email: details.email,
          });
          assert.equal(invalid.response.status, 400);
          for (let n = 0; n < 2; n++)
            assert.equal(
              (
                await call("/api/conversion-events", telemetry.POST, {
                  id,
                  name: "quote_form_started",
                  source: "quote_form",
                  step: 1,
                })
              ).response.status,
              204,
            );
          assert.equal(
            await prisma.conversionEvent.count({ where: { id } }),
            1,
          );
        },
      );
      await t.test(
        "mover and cleaner registration still create distinct accounts with email disabled",
        async () => {
          const registration = {
            name: "Validation Partner",
            companyName: "Validation Business",
            phone: "0211111111",
            password: "ValidationOnly123!",
            confirmPassword: "ValidationOnly123!",
            acceptedTerms: true,
          };
          for (const kind of ["mover", "cleaner"] as const) {
            const route =
              kind === "mover"
                ? await import("../app/api/mover/register/route")
                : await import("../app/api/cleaner/register/route");
            const email = kind + "-registration-" + tag + "@validation.invalid";
            const r = await call("/api/" + kind + "/register", route.POST, {
              ...registration,
              email,
            });
            assert.equal(
              r.response.status,
              200,
              await r.response.clone().text(),
            );
            const account = await prisma.user.findUniqueOrThrow({
              where: { email },
              include: { moverCompany: true, cleanerCompany: true },
            });
            assert.equal(account.role, kind.toUpperCase());
            assert.ok(
              kind === "mover" ? account.moverCompany : account.cleanerCompany,
            );
          }
        },
      );
    } finally {
      await prisma.moverCompany.update({
        where: { id: mover.id },
        data: { status: "INACTIVE" },
      });
      await prisma.cleanerCompany.updateMany({
        where: { id: { in: [cleanerA.id, cleanerW.id] } },
        data: { status: "INACTIVE" },
      });
      await prisma.$disconnect();
    }
  },
);
