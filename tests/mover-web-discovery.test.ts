import assert from "node:assert/strict";
import test from "node:test";
import {
  parseWebCandidate,
  parseWebSearch,
  searchWebMovers,
  getWebMover,
  webDiscoveryInputSchema,
  webDiscoveryDailyLimit,
} from "../lib/mover-web-discovery";
import { DiscoveryError, discoveryPrefill } from "../lib/mover-discovery";

const listing = {
  place_id: "ChIJ_fixture_mover",
  title: "Example Movers",
  phone: "+64 21 111 2222",
  website: "https://example.invalid",
  type: "Moving company",
  open_state: "Closed - Opens Monday",
  address: "Never copied",
  rating: 5,
  reviews: [{ snippet: "Not copied" }],
  email: "unverified@example.invalid",
};

test("Maps projection does not infer business closure from opening hours, email, coverage or permission", () => {
  const candidate = parseWebCandidate(listing)!;
  assert.equal(candidate.inactive, false);
  assert.equal(candidate.email, "");
  assert.equal(candidate.nzbn, "");
  assert.equal(candidate.website, "https://example.invalid/");
  assert.equal(candidate.phone, listing.phone);
  assert.doesNotMatch(
    JSON.stringify(candidate),
    /Never copied|Not copied|unverified@example/,
  );
  assert.equal(
    parseWebCandidate({ ...listing, open_state: "Permanently closed" })!
      .inactive,
    true,
  );
  assert.equal(
    parseWebCandidate({ ...listing, temporarily_closed: true })!.inactive,
    true,
  );
  assert.equal(
    parseWebCandidate({ ...listing, website: "javascript:alert(1)" })!.website,
    "",
  );
  assert.equal(
    parseWebCandidate({ ...listing, place_id: "https://attacker.invalid" }),
    null,
  );
  const form = discoveryPrefill(candidate);
  assert.equal(form.consentBasis, "UNKNOWN");
  assert.deepEqual(form.serviceAreas, []);
  assert.deepEqual(form.serviceTypes, []);
  assert.equal(form.operatingRegion, "");
  assert.equal(form.email, "");
  assert.match(form.notes, /SerpApi/);
  assert.doesNotMatch(form.notes, /NZBN:/);
});

test("Maps parser handles pages, exact-place results and empty results without leaking errors", () => {
  assert.deepEqual(
    parseWebSearch({
      search_metadata: { status: "Success" },
      search_information: { local_results_state: "Fully empty" },
      error: "Google hasn't returned any results for this query.",
    }),
    { items: [], hasMore: false },
  );
  assert.equal(
    parseWebSearch({
      local_results: Array(30).fill(listing),
      serpapi_pagination: { next: "https://never-follow.invalid" },
    }).items.length,
    1,
  );
  assert.equal(
    parseWebSearch({
      local_results: [listing],
      serpapi_pagination: { next: "x" },
    }).hasMore,
    true,
  );
  assert.equal(parseWebSearch({ place_results: listing }).items.length, 1);
  assert.deepEqual(parseWebSearch({ local_results: [] }), {
    items: [],
    hasMore: false,
  });
  assert.deepEqual(
    parseWebSearch({
      search_information: { local_results_state: "Fully empty" },
    }),
    { items: [], hasMore: false },
  );
  assert.throws(
    () => parseWebSearch({ error: "private-key-and-account-details" }),
    (e) => e instanceof DiscoveryError && !e.message.includes("private-key"),
  );
  assert.throws(() => parseWebSearch({ unknown: [] }), DiscoveryError);
});

test("web discovery accepts only bounded queries, cities, pagination and provider identifiers", () => {
  const input = {
    action: "maps_search",
    query: "movers",
    city: "Auckland",
    page: 1,
  };
  assert.equal(webDiscoveryInputSchema.safeParse(input).success, true);
  for (const change of [
    { city: "" },
    { query: "https://attacker.invalid" },
    { page: 7 },
    { page: -1 },
    { api_key: "override" },
  ]) {
    assert.equal(
      webDiscoveryInputSchema.safeParse({ ...input, ...change }).success,
      false,
    );
  }
  assert.equal(
    webDiscoveryInputSchema.safeParse({
      action: "maps_details",
      placeId: "bad?api_key=leak",
    }).success,
    false,
  );
});

test("SerpApi requests use a fixed host, NZ query, explicit pages and verified detail identity", async () => {
  const previous = process.env.SERPAPI_API_KEY;
  process.env.SERPAPI_API_KEY = "fixture-secret";
  let calls = 0;
  const mock: typeof fetch = async (input, init) => {
    calls++;
    const url = new URL(String(input));
    assert.equal(url.origin, "https://serpapi.com");
    assert.equal(url.pathname, "/search.json");
    assert.equal(url.searchParams.get("api_key"), "fixture-secret");
    assert.equal(url.searchParams.get("engine"), "google_maps");
    assert.equal(url.searchParams.get("gl"), "nz");
    assert.equal(init?.redirect, "error");
    assert.equal(init?.cache, "no-store");
    if (url.searchParams.has("place_id"))
      return Response.json({ place_results: listing });
    assert.equal(
      url.searchParams.get("q"),
      "removals in Wellington, New Zealand",
    );
    assert.equal(url.searchParams.get("start"), "20");
    return Response.json({ local_results: [listing] });
  };
  try {
    assert.equal(
      (await searchWebMovers("removals", "Wellington", 2, mock)).items.length,
      1,
    );
    assert.equal(
      (await getWebMover(listing.place_id, mock)).companyName,
      listing.title,
    );
    await assert.rejects(
      getWebMover("different_id", mock),
      /requested business/,
    );
    assert.equal(calls, 3);
  } finally {
    if (previous === undefined) delete process.env.SERPAPI_API_KEY;
    else process.env.SERPAPI_API_KEY = previous;
  }
});

test("missing keys, provider errors, timeouts and oversized responses produce safe failures", async () => {
  const previous = process.env.SERPAPI_API_KEY;
  try {
    delete process.env.SERPAPI_API_KEY;
    await assert.rejects(
      searchWebMovers("movers", "Auckland", 1, async () => {
        throw Error("must not call");
      }),
      (e) => e instanceof DiscoveryError && e.code === "SETUP_REQUIRED",
    );
    process.env.SERPAPI_API_KEY = "fixture-secret";
    for (const status of [401, 403, 429, 500]) {
      await assert.rejects(
        searchWebMovers(
          "movers",
          "Auckland",
          1,
          async () => new Response("fixture-secret", { status }),
        ),
        (e) =>
          e instanceof DiscoveryError && !e.message.includes("fixture-secret"),
      );
    }
    await assert.rejects(
      searchWebMovers("movers", "Auckland", 1, async () => {
        throw Error("fixture-secret");
      }),
      /could not be reached/,
    );
    await assert.rejects(
      searchWebMovers("movers", "Auckland", 1, async () => new Response("{")),
      /unreadable/,
    );
    await assert.rejects(
      searchWebMovers(
        "movers",
        "Auckland",
        1,
        async () => new Response("x".repeat(1500001)),
      ),
      /too large/,
    );
  } finally {
    if (previous === undefined) delete process.env.SERPAPI_API_KEY;
    else process.env.SERPAPI_API_KEY = previous;
  }
});

test("invalid daily caps use the bounded default", () => {
  const previous = process.env.MOVER_DISCOVERY_DAILY_LIMIT;
  try {
    for (const value of ["0", "-1", "oops", "10001"]) {
      process.env.MOVER_DISCOVERY_DAILY_LIMIT = value;
      assert.equal(webDiscoveryDailyLimit(), 100);
    }
    process.env.MOVER_DISCOVERY_DAILY_LIMIT = "25";
    assert.equal(webDiscoveryDailyLimit(), 25);
  } finally {
    if (previous === undefined) delete process.env.MOVER_DISCOVERY_DAILY_LIMIT;
    else process.env.MOVER_DISCOVERY_DAILY_LIMIT = previous;
  }
});
