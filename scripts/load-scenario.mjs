import { performance } from "node:perf_hooks";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const scrypt = promisify(scryptCallback);

const baseUrl = process.env.LOAD_BASE_URL ?? "http://127.0.0.1:3000";
const totalUsers = Number(process.env.LOAD_TOTAL_USERS ?? 1000);
const customerUsers = Number(process.env.LOAD_CUSTOMER_USERS ?? 600);
const publicUsers = Number(process.env.LOAD_PUBLIC_USERS ?? 220);
const moverUsers = Number(process.env.LOAD_MOVER_USERS ?? 180);
const tempMoverCount = Number(process.env.LOAD_TEMP_MOVERS ?? 12);
const requestTimeoutMs = Number(process.env.LOAD_REQUEST_TIMEOUT_MS ?? 15000);
const maxConcurrency = Number(process.env.LOAD_MAX_CONCURRENCY ?? totalUsers);
const shouldPatchMoverProfile = process.env.LOAD_MOVER_PATCH_PROFILE === "true";
const publicMoverIdOverride = process.env.LOAD_PUBLIC_MOVER_ID ?? null;
const moverPassword = process.env.LOAD_TEST_MOVER_PASSWORD ?? "LoadTest123!";
const runId = `loadtest-${Date.now()}`;

if (customerUsers + publicUsers + moverUsers !== totalUsers) {
  console.error(
    `User split must sum to ${totalUsers}. Got ${customerUsers + publicUsers + moverUsers}.`,
  );
  process.exit(1);
}

const metrics = [];
const createdQuoteIds = [];
const tempMoverEmails = [];
const leadIdsTouched = new Set();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function percentile(sortedValues, p) {
  if (!sortedValues.length) return 0;
  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.ceil((p / 100) * sortedValues.length) - 1));
  return sortedValues[index];
}

function summarizeMetricGroup(entries) {
  const durations = entries
    .map((entry) => entry.durationMs)
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  const okCount = entries.filter((entry) => entry.ok).length;
  const statusCounts = entries.reduce((accumulator, entry) => {
    const key = String(entry.status);
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});

  return {
    requests: entries.length,
    okRate: Number(((okCount / entries.length) * 100).toFixed(2)),
    p50Ms: Number(percentile(durations, 50).toFixed(2)),
    p95Ms: Number(percentile(durations, 95).toFixed(2)),
    maxMs: Number(Math.max(...durations, 0).toFixed(2)),
    statuses: statusCounts,
  };
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${Buffer.from(derivedKey).toString("hex")}`;
}

async function runWithConcurrency(taskFactories, limit) {
  const results = new Array(taskFactories.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= taskFactories.length) return;

      try {
        results[currentIndex] = await taskFactories[currentIndex]();
      } catch (error) {
        results[currentIndex] = Promise.reject(error);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, taskFactories.length)) }, () => worker()),
  );

  return Promise.allSettled(results);
}

function makeIp(offset, segment = 10) {
  const a = 10 + (segment % 200);
  const b = Math.floor(offset / 250) % 250;
  const c = (offset % 250) + 1;
  return `${a}.1.${b}.${c}`;
}

async function request(label, path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  const startedAt = performance.now();

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
    });
    const durationMs = performance.now() - startedAt;
    const contentType = response.headers.get("content-type") ?? "";
    const raw = await response.text();
    let body = raw;

    if (contentType.includes("application/json")) {
      try {
        body = raw ? JSON.parse(raw) : null;
      } catch {
        body = raw;
      }
    }

    metrics.push({
      label,
      status: response.status,
      ok: response.ok,
      durationMs,
    });

    return { ok: response.ok, status: response.status, durationMs, body, headers: response.headers };
  } catch (error) {
    const durationMs = performance.now() - startedAt;
    metrics.push({
      label,
      status: error instanceof Error ? error.name : "ERR",
      ok: false,
      durationMs,
    });

    return {
      ok: false,
      status: error instanceof Error ? error.name : "ERR",
      durationMs,
      body: error instanceof Error ? error.message : "Unknown request error",
      headers: new Headers(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function createTempMovers() {
  const passwordHash = await hashPassword(moverPassword);
  const movers = [];

  for (let index = 0; index < tempMoverCount; index += 1) {
    const email = `${runId}-mover-${index}@loadtest.local`;
    tempMoverEmails.push(email);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name: `Load Test Mover ${index}`,
          passwordHash,
          emailVerifiedAt: new Date(),
          role: "MOVER",
        },
      });

      const mover = await tx.moverCompany.create({
        data: {
          userId: user.id,
          companyName: `Load Test Movers ${index}`,
          contactPerson: `Load Test Mover ${index}`,
          phone: "+64 21 555 0101",
          serviceAreas: ["Auckland", "Wellington"],
          nzbn: `9999999999${String(index).padStart(3, "0")}`,
          yearsOperating: 5,
          businessDescription: "Temporary mover account used for local load testing.",
        },
        include: {
          user: true,
        },
      });

      return mover;
    });

    movers.push(created);
  }

  return movers;
}

async function getStablePublicMoverId() {
  if (publicMoverIdOverride) return publicMoverIdOverride;

  const mover = await prisma.moverCompany.findFirst({
    where: {
      status: "ACTIVE",
    },
    select: {
      id: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return mover?.id ?? null;
}

function buildQuotePayload(index) {
  return {
    name: `Load Test Customer ${index}`,
    email: `${runId}-quote-${index}@loadtest.local`,
    phone: `+64 21 800 ${String(index).padStart(4, "0")}`,
    fromPropertyType: "House",
    toPropertyType: "Apartment",
    bedrooms: String((index % 4) + 1),
    fromAddress: `${index + 1} Queen Street`,
    fromCity: "Auckland",
    fromRegion: "Auckland",
    fromPostcode: "1010",
    fromCountry: "New Zealand",
    toAddress: `${index + 1} Lambton Quay`,
    toCity: "Wellington",
    toRegion: "Wellington",
    toPostcode: "6011",
    toCountry: "New Zealand",
    moveDate: "2026-05-01",
    dateFlexible: false,
    movingWhat: "Household furniture and boxes",
  };
}

async function publicFlow(index, moverId) {
  await request("page.home", "/");
  await request("page.faq", "/faq");
  await request("page.movers", "/movers");
  if (moverId) {
    await request("page.mover.detail", `/movers/${moverId}`);
  }

  return { kind: "public", ok: true };
}

async function customerFlow(index) {
  const ip = makeIp(index, 20);

  await request("page.home", "/");
  await request("page.quote", "/quote");
  const quoteResult = await request("api.quote", "/api/quote-requests", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(buildQuotePayload(index)),
  });

  if (quoteResult.ok && quoteResult.body && typeof quoteResult.body === "object" && quoteResult.body.id) {
    createdQuoteIds.push(quoteResult.body.id);
  }

  return { kind: "customer", ok: quoteResult.ok };
}

async function moverFlow(index, mover) {
  const ip = makeIp(index, 60);
  await request("page.mover.login", "/mover/login");

  const loginResult = await request("api.mover.login", "/api/mover/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({
      email: mover.user.email,
      password: moverPassword,
    }),
  });

  const setCookies =
    typeof loginResult.headers.getSetCookie === "function"
      ? loginResult.headers.getSetCookie()
      : [loginResult.headers.get("set-cookie")].filter(Boolean);
  const cookie = setCookies.map((value) => value.split(";")[0]).join("; ");

  if (!loginResult.ok || !cookie) {
    return { kind: "mover", ok: false, stage: "login" };
  }

  const authHeaders = { cookie };
  const profileResult = await request("api.mover.profile.get", "/api/mover/profile", {
    headers: authHeaders,
  });

  if (shouldPatchMoverProfile && profileResult.ok && profileResult.body && typeof profileResult.body === "object") {
    await request("api.mover.profile.patch", "/api/mover/profile", {
      method: "PATCH",
      headers: {
        ...authHeaders,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        companyName: profileResult.body.companyName,
        businessDescription: profileResult.body.businessDescription ?? "",
        contactPerson: profileResult.body.contactPerson ?? "Load Test Mover",
        phone: profileResult.body.phone ?? "+64 21 555 0101",
        nzbn: profileResult.body.nzbn ?? "",
        yearsOperating: profileResult.body.yearsOperating ?? 5,
        serviceAreas: profileResult.body.serviceAreas ?? ["Auckland"],
      }),
    });
  }

  let targetLead = null;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const leadsResult = await request("api.mover.leads", "/api/mover/leads", {
      headers: authHeaders,
    });

    if (Array.isArray(leadsResult.body)) {
      targetLead = leadsResult.body.find(
        (lead) =>
          lead?.quoteRequest?.email?.includes(`${runId}-quote-`) &&
          ["NEW", "NOTIFIED", "PURCHASED", "CONTACTED"].includes(lead.status),
      );
    }

    if (targetLead) break;
    await sleep(250);
  }

  if (targetLead?.id) {
    leadIdsTouched.add(targetLead.id);

    const unlockResult = await request("api.mover.leads.unlock", `/api/mover/leads/${targetLead.id}/unlock`, {
      method: "POST",
      headers: authHeaders,
    });

    if (unlockResult.ok) {
      await request("api.mover.leads.status", `/api/mover/leads/${targetLead.id}/status`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
        },
        body: JSON.stringify({ status: "CONTACTED" }),
      });
    }
  }

  await request("api.mover.logout", "/api/mover/logout", {
    method: "POST",
    headers: authHeaders,
  });

  return { kind: "mover", ok: true };
}

async function cleanup() {
  const quoteIds = await prisma.quoteRequest.findMany({
    where: {
      email: {
        contains: `${runId}-quote-`,
      },
    },
    select: { id: true },
  });
  const resolvedQuoteIds = quoteIds.map((quote) => quote.id);

  const leadIds = await prisma.lead.findMany({
    where: {
      quoteRequestId: {
        in: resolvedQuoteIds,
      },
    },
    select: { id: true },
  });
  const resolvedLeadIds = leadIds.map((lead) => lead.id);

  if (resolvedLeadIds.length) {
    await prisma.auditLog.deleteMany({ where: { leadId: { in: resolvedLeadIds } } });
    await prisma.payment.deleteMany({ where: { leadId: { in: resolvedLeadIds } } });
    await prisma.reviewSurveyInvite.deleteMany({ where: { leadId: { in: resolvedLeadIds } } });
    await prisma.review.deleteMany({ where: { leadId: { in: resolvedLeadIds } } });
    await prisma.lead.deleteMany({ where: { id: { in: resolvedLeadIds } } });
  }

  if (resolvedQuoteIds.length) {
    await prisma.quoteRequest.deleteMany({ where: { id: { in: resolvedQuoteIds } } });
  }

  const tempUsers = await prisma.user.findMany({
    where: {
      email: {
        in: tempMoverEmails,
      },
    },
    select: { id: true },
  });
  const tempUserIds = tempUsers.map((user) => user.id);

  if (tempUserIds.length) {
    await prisma.authToken.deleteMany({ where: { userId: { in: tempUserIds } } });
    await prisma.moverCompany.deleteMany({ where: { userId: { in: tempUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: tempUserIds } } });
  }

  return {
    deletedQuotes: resolvedQuoteIds.length,
    deletedLeads: resolvedLeadIds.length,
    deletedTempMovers: tempUserIds.length,
  };
}

function collectSummary(startedAt, scenarioResults, cleanupResult) {
  const byLabel = metrics.reduce((accumulator, metric) => {
    const bucket = accumulator.get(metric.label) ?? [];
    bucket.push(metric);
    accumulator.set(metric.label, bucket);
    return accumulator;
  }, new Map());

  const labelSummary = Array.from(byLabel.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, entries]) => ({
      label,
      ...summarizeMetricGroup(entries),
    }));

  const overall = summarizeMetricGroup(metrics);
  const elapsedMs = performance.now() - startedAt;
  const scenarioSummary = scenarioResults.reduce(
    (accumulator, result) => {
      if (result.status === "fulfilled") {
        accumulator.fulfilled += 1;
        const kind = result.value?.kind ?? "unknown";
        accumulator.byKind[kind] = accumulator.byKind[kind] ?? { ok: 0, failed: 0 };

        if (result.value?.ok) {
          accumulator.byKind[kind].ok += 1;
        } else {
          accumulator.byKind[kind].failed += 1;
          if (result.value?.stage) {
            accumulator.failureStages[result.value.stage] = (accumulator.failureStages[result.value.stage] ?? 0) + 1;
          }
        }
      } else {
        accumulator.rejected += 1;
      }

      return accumulator;
    },
    {
      fulfilled: 0,
      rejected: 0,
      byKind: {},
      failureStages: {},
    },
  );

  return {
    runId,
    baseUrl,
    totals: {
      users: totalUsers,
      publicUsers,
      customerUsers,
      moverUsers,
      maxConcurrency,
      tempMoversCreated: tempMoverCount,
      requests: metrics.length,
      createdQuotes: createdQuoteIds.length,
      touchedLeads: leadIdsTouched.size,
    },
    overall: {
      ...overall,
      elapsedMs: Number(elapsedMs.toFixed(2)),
      requestsPerSecond: Number((metrics.length / (elapsedMs / 1000)).toFixed(2)),
    },
    scenarioSummary,
    cleanup: cleanupResult,
    endpoints: labelSummary,
  };
}

async function main() {
  const startedAt = performance.now();
  const stablePublicMoverId = await getStablePublicMoverId();
  const tempMovers = await createTempMovers();

  const taskFactories = [
    ...Array.from({ length: publicUsers }, (_, index) => () => publicFlow(index, stablePublicMoverId)),
    ...Array.from({ length: customerUsers }, (_, index) => () => customerFlow(index)),
    ...Array.from({ length: moverUsers }, (_, index) => () => moverFlow(index, tempMovers[index % tempMovers.length])),
  ];

  const scenarioResults = await runWithConcurrency(taskFactories, maxConcurrency);
  const cleanupResult = await cleanup();
  const summary = collectSummary(startedAt, scenarioResults, cleanupResult);

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch(async (error) => {
    console.error(error);
    try {
      const cleanupResult = await cleanup();
      console.error("cleanup:", JSON.stringify(cleanupResult));
    } catch (cleanupError) {
      console.error(cleanupError);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
