import assert from "node:assert/strict";
import test from "node:test";
import {
  discoveryInputSchema,
  parseDiscoveryCandidate,
  parseDiscoverySearch,
  discoveryPrefill,
  safeDiscoveryWebsite,
  searchNzbnMovers,
  getDiscoveredMover,
  DiscoveryError,
} from "../lib/mover-discovery";
const entity = {
  nzbn: "9429041752715",
  entityName: "Example Movers Limited",
  entityStatusCode: "50",
  entityStatusDescription: "Registered",
  tradingNames: [{ name: "Example Movers" }],
  emailAddresses: [{ emailAddress: "Office@Example.invalid" }],
  websites: [{ url: "https://example.invalid/" }],
  phoneNumbers: [{ phoneNumber: "+64 21 111 2222" }],
  directors: [
    { name: "Must never be projected", address: "Private director address" },
  ],
};
test("registry projection copies only public business contact fields, never director records", () => {
  const result = parseDiscoveryCandidate(entity)!;
  assert.equal(result.companyName, entity.entityName);
  assert.equal(result.email, "office@example.invalid");
  assert.equal(result.phone, "+64 21 111 2222");
  assert.equal(result.website, "https://example.invalid/");
  assert.deepEqual(result.tradingNames, ["Example Movers"]);
  assert.equal(result.inactive, false);
  assert.doesNotMatch(JSON.stringify(result), /director|Must never|Private/);
  assert.equal(
    parseDiscoveryCandidate({ ...entity, nzbn: "1234567890123" }),
    null,
  );
  assert.equal(parseDiscoveryCandidate({ nzbn: entity.nzbn }), null);
  assert.equal(
    parseDiscoveryCandidate({ ...entity, entityStatusDescription: "Removed" })
      ?.inactive,
    true,
  );
});
test("missing public contact data stays empty and never grants service coverage or outreach permission", () => {
  const result = parseDiscoveryCandidate({
    nzbn: entity.nzbn,
    entityName: entity.entityName,
  })!;
  const prefill = discoveryPrefill(result);
  assert.equal(result.email, "");
  assert.equal(prefill.consentBasis, "UNKNOWN");
  assert.equal(prefill.consentEvidence, "");
  assert.deepEqual(prefill.serviceAreas, []);
  assert.deepEqual(prefill.serviceTypes, []);
  assert.equal(prefill.longDistance, false);
  assert.equal(prefill.contactName, "");
  assert.match(prefill.notes, /NZBN: 9429041752715/);
});
test("search responses are bounded, deduplicated and fail clearly on unexpected shapes", () => {
  const results = parseDiscoverySearch({
    items: [
      entity,
      entity,
      { entityName: "No NZBN" },
      ...Array(30).fill(entity),
    ],
  });
  assert.equal(results.items.length, 1);
  assert.equal(results.hasMore, true);
  assert.throws(
    () => parseDiscoverySearch({ error: "upstream failure" }),
    DiscoveryError,
  );
});
test("search input bounds pagination, excludes URLs/emails and encodes name punctuation", () => {
  assert.equal(
    discoveryInputSchema.safeParse({
      action: "search",
      query: "movers",
      page: 0,
    }).success,
    false,
  );
  assert.equal(
    discoveryInputSchema.safeParse({
      action: "search",
      query: "movers",
      page: 101,
    }).success,
    false,
  );
  assert.equal(
    discoveryInputSchema.safeParse({
      action: "search",
      query: "person@example.invalid",
    }).success,
    false,
  );
  assert.equal(
    discoveryInputSchema.safeParse({ action: "details", nzbn: "../metadata" })
      .success,
    false,
  );
  assert.equal(
    discoveryInputSchema.safeParse({
      action: "search",
      query: "Smith & Sons Movers",
      page: 2,
    }).success,
    true,
  );
});
test("website suggestions reject unsafe protocols, local addresses and embedded credentials", () => {
  assert.equal(safeDiscoveryWebsite("javascript:alert(1)"), "");
  assert.equal(safeDiscoveryWebsite("http://127.0.0.1/path"), "");
  assert.equal(safeDiscoveryWebsite("https://user:pass@example.invalid"), "");
  assert.equal(safeDiscoveryWebsite("http://localhost/a"), "");
  assert.equal(safeDiscoveryWebsite("http://[::1]/"), "");
  assert.equal(
    safeDiscoveryWebsite("example.invalid"),
    "https://example.invalid/",
  );
});
test("provider adapter uses the documented NZBN endpoint, pagination, auth and no redirects", async () => {
  const prior = {
    key: process.env.NZBN_API_SUBSCRIPTION_KEY,
    base: process.env.NZBN_API_BASE_URL,
  };
  process.env.NZBN_API_SUBSCRIPTION_KEY = "validation-only-key";
  process.env.NZBN_API_BASE_URL =
    "https://api.business.govt.nz/gateway/nzbn/v5";
  const calls: { url: URL; init: RequestInit | undefined }[] = [];
  const mock: typeof fetch = async (input, init) => {
    calls.push({ url: new URL(String(input)), init });
    return Response.json(
      String(input).includes("/entities?") ? { items: [entity] } : entity,
    );
  };
  try {
    const search = await searchNzbnMovers("Smith & Sons Movers", 2, mock);
    assert.equal(search.items[0].nzbn, entity.nzbn);
    assert.equal(calls[0].url.pathname, "/gateway/nzbn/v5/entities");
    assert.equal(
      calls[0].url.searchParams.get("search-term"),
      "Smith & Sons Movers",
    );
    assert.equal(calls[0].url.searchParams.get("page"), "2");
    assert.equal(calls[0].url.searchParams.get("page-size"), "20");
    assert.equal(
      new Headers(calls[0].init?.headers).get("Ocp-Apim-Subscription-Key"),
      "validation-only-key",
    );
    assert.equal(calls[0].init?.redirect, "error");
    const details = await getDiscoveredMover(entity.nzbn, mock);
    assert.equal(details.email, "office@example.invalid");
    assert.equal(
      calls[1].url.pathname,
      "/gateway/nzbn/v5/entities/" + entity.nzbn,
    );
    await assert.rejects(
      getDiscoveredMover(entity.nzbn, async () =>
        Response.json({ ...entity, nzbn: "9429000106078" }),
      ),
      /requested business/,
    );
  } finally {
    for (const [key, value] of Object.entries({
      NZBN_API_SUBSCRIPTION_KEY: prior.key,
      NZBN_API_BASE_URL: prior.base,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
test("missing keys, rejected credentials, throttling and timeouts return actionable errors without credentials", async () => {
  const previous = process.env.NZBN_API_SUBSCRIPTION_KEY;
  delete process.env.NZBN_API_SUBSCRIPTION_KEY;
  try {
    let called = false;
    await assert.rejects(
      searchNzbnMovers("movers", 1, async () => {
        called = true;
        return Response.json({ items: [] });
      }),
      (error) =>
        error instanceof DiscoveryError && error.code === "SETUP_REQUIRED",
    );
    assert.equal(called, false);
    process.env.NZBN_API_SUBSCRIPTION_KEY = "do-not-expose-this-key";
    for (const status of [401, 403, 429, 500]) {
      await assert.rejects(
        searchNzbnMovers(
          "movers",
          1,
          async () => new Response(null, { status }),
        ),
        (error) =>
          error instanceof DiscoveryError &&
          !error.message.includes("do-not-expose") &&
          (status === 429 ? error.status === 429 : error.status === 503),
      );
    }
    await assert.rejects(
      searchNzbnMovers("movers", 1, async () => {
        throw Error("timeout with secret");
      }),
      (error) =>
        error instanceof DiscoveryError &&
        error.code === "PROVIDER_UNAVAILABLE" &&
        !error.message.includes("secret"),
    );
  } finally {
    if (previous === undefined) delete process.env.NZBN_API_SUBSCRIPTION_KEY;
    else process.env.NZBN_API_SUBSCRIPTION_KEY = previous;
  }
});
test("a registry key is never sent to an arbitrary configured host", async () => {
  const previous = {
    key: process.env.NZBN_API_SUBSCRIPTION_KEY,
    base: process.env.NZBN_API_BASE_URL,
  };
  process.env.NZBN_API_SUBSCRIPTION_KEY = "key";
  process.env.NZBN_API_BASE_URL = "https://unrelated.invalid/steal";
  try {
    let called = false;
    await assert.rejects(
      searchNzbnMovers("movers", 1, async () => {
        called = true;
        return Response.json({ items: [] });
      }),
      (error) =>
        error instanceof DiscoveryError && error.code === "SETUP_REQUIRED",
    );
    assert.equal(called, false);
  } finally {
    if (previous.key === undefined)
      delete process.env.NZBN_API_SUBSCRIPTION_KEY;
    else process.env.NZBN_API_SUBSCRIPTION_KEY = previous.key;
    if (previous.base === undefined) delete process.env.NZBN_API_BASE_URL;
    else process.env.NZBN_API_BASE_URL = previous.base;
  }
});
