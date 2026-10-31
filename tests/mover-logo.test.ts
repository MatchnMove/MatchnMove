import assert from "node:assert/strict";
import test from "node:test";
import { getMoverLogoUrl, toStoredMoverLogoUrl } from "../lib/mover-logo";

test("logo upload revisions bypass previous redirects without embedding expiring credentials", () => {
  const old = getMoverLogoUrl("mover", toStoredMoverLogoUrl("mover-logos/mover/old.webp"));
  const current = getMoverLogoUrl("mover", toStoredMoverLogoUrl("mover-logos/mover/current.webp"));
  assert.equal(current, "/api/public-movers/mover/logo?v=current.webp");
  assert.notEqual(current, old);
  assert.equal(getMoverLogoUrl("mover", null), null);
  assert.equal(getMoverLogoUrl("mover", "storage:"), null);
  assert.equal(getMoverLogoUrl("mover", "https://example.test/logo.png"), "https://example.test/logo.png");
});

test("public logos require an active mover and never cache expiring redirects or errors", async t => {
  const env = { STORAGE_ACCESS_KEY: "unit-test-only", STORAGE_SECRET_KEY: "unit-test-only-secret", STORAGE_BUCKET: "test-logos", STORAGE_REGION: "auto", STORAGE_ENDPOINT: "https://storage.example.test", STORAGE_FORCE_PATH_STYLE: "false", STORAGE_SIGNED_URL_TTL_SECONDS: "60" };
  const previous = new Map(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  t.after(() => { for (const [key, value] of previous) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  let record: { logoUrl: string | null } | null = { logoUrl: toStoredMoverLogoUrl("mover-logos/mover/logo.png") };
  let fail = false;
  const queries: unknown[] = [];
  const previousPrisma = Object.getOwnPropertyDescriptor(globalThis, "prisma");
  const findFirst = async (args: unknown) => {
    queries.push(args);
    if (fail) throw new Error("Test storage failure");
    return record;
  };
  Object.defineProperty(globalThis, "prisma", { configurable: true, writable: true, value: { moverCompany: { findFirst } } });
  t.after(() => { if (previousPrisma) Object.defineProperty(globalThis, "prisma", previousPrisma); else Reflect.deleteProperty(globalThis, "prisma"); });
  const { GET } = await import("../app/api/public-movers/[id]/logo/route");
  const request = new Request("https://www.matchnmove.co.nz/api/public-movers/mover/logo");
  const params = { params: Promise.resolve({ id: "mover" }) };
  const response = await GET(request, params);
  assert.equal(response.status, 302);
  assert.match(response.headers.get("cache-control")!, /no-store/);
  assert.equal(new URL(response.headers.get("location")!).searchParams.get("X-Amz-Expires"), "60");
  assert.deepEqual(queries[0], { where: { id: "mover", status: "ACTIVE" }, select: { logoUrl: true } });
  for (const value of [null, { logoUrl: null }]) {
    record = value;
    const missing = await GET(request, params);
    assert.equal(missing.status, 404);
    assert.match(missing.headers.get("cache-control")!, /no-store/);
  }
  fail = true;
  const unavailable = await GET(request, params);
  assert.equal(unavailable.status, 503);
  assert.match(unavailable.headers.get("cache-control")!, /no-store/);
  assert.doesNotMatch(await unavailable.text(), /Test storage failure/);
});
