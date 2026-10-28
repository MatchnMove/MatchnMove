import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  recruitmentActor,
  RecruitmentError,
  locked,
  checkActor,
  audit,
} from "@/lib/recruitment";
import { isRecruitmentMutationRequest } from "@/lib/recruitment-request";
import { rateLimit } from "@/lib/rate-limit";
import {
  DiscoveryError,
  discoveryConfigured,
  discoveryInputSchema,
  searchNzbnMovers,
  getDiscoveredMover,
  discoveryPrefill,
} from "@/lib/mover-discovery";
import { annotateDiscoveredMovers } from "@/lib/mover-discovery-duplicates";
import {
  webDiscoveryInputSchema,
  webDiscoveryConfigured,
  webDiscoveryDailyLimit,
  searchWebMovers,
  getWebMover,
} from "@/lib/mover-web-discovery";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
function errorResponse(error: unknown) {
  if (error instanceof DiscoveryError || error instanceof RecruitmentError)
    return NextResponse.json(
      {
        error: error.message,
        code: error instanceof DiscoveryError ? error.code : "ACCESS_DENIED",
      },
      { status: error.status, headers },
    );
  if (error instanceof z.ZodError || error instanceof SyntaxError)
    return NextResponse.json(
      {
        error: "Check the company keyword, city or business identifier.",
        code: "INVALID_INPUT",
      },
      { status: 400, headers },
    );
  console.error(
    "Mover discovery failed",
    error instanceof Error ? error.name : "Unknown",
  );
  return NextResponse.json(
    {
      error: "Mover discovery is unavailable. Please try again.",
      code: "UNAVAILABLE",
    },
    { status: 503, headers },
  );
}
export async function GET() {
  try {
    await recruitmentActor();
    return NextResponse.json(
      {
        configured: discoveryConfigured(),
        webConfigured: webDiscoveryConfigured(),
        webDailyLimit: webDiscoveryDailyLimit(),
        provider: "NZBN Register",
        setupUrl: "https://portal.api.business.govt.nz/api/nzbn",
      },
      { headers },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(req: NextRequest) {
  try {
    if (!isRecruitmentMutationRequest(req))
      throw new RecruitmentError("Invalid request origin or content.", 403);
    const actor = await recruitmentActor();
    if (!rateLimit("mover-discovery:" + actor.id, 20).allowed)
      throw new RecruitmentError("Please wait before searching again.", 429);
    const raw = await req.text();
    if (raw.length > 1000)
      throw new RecruitmentError("Search request is too large.", 413);
    const input = z
      .union([discoveryInputSchema, webDiscoveryInputSchema])
      .parse(JSON.parse(raw));
    // Recheck account state before using any server-side provider credential.
    await locked((tx) => checkActor(tx, actor));
    if (input.action === "maps_search" || input.action === "maps_details") {
      if (!webDiscoveryConfigured())
        throw new DiscoveryError(
          "Connect SerpApi before searching. The owner needs to configure its server-side API key.",
          503,
          "SETUP_REQUIRED",
        );
      // Reserve a request before calling the paid provider. The shared DB lock
      // makes this cap apply across admins and server instances, including failures.
      await locked(async (tx) => {
        await checkActor(tx, actor);
        const used = await tx.adminAuditLog.count({
          where: {
            action: "mover_discovery_web_request",
            createdAt: { gte: new Date(Date.now() - 86400000) },
          },
        });
        if (used >= webDiscoveryDailyLimit())
          throw new DiscoveryError(
            "The team's discovery request limit for the last 24 hours has been reached. Try again later or ask the owner to adjust the limit.",
            429,
            "DAILY_LIMIT",
          );
        await audit(
          tx,
          actor.id,
          "mover_discovery_web_request",
          input.action === "maps_search"
            ? {
                provider: "SERPAPI",
                action: "search",
                query: input.query,
                city: input.city,
                page: input.page,
              }
            : { provider: "SERPAPI", action: "review", placeId: input.placeId },
        );
      });
      if (input.action === "maps_search") {
        const found = await searchWebMovers(
          input.query,
          input.city,
          input.page,
        );
        const items = await annotateDiscoveredMovers(found.items, actor);
        await locked((tx) => checkActor(tx, actor));
        return NextResponse.json(
          { items, page: input.page, hasMore: found.hasMore && input.page < 6 },
          { headers },
        );
      }
      const candidate = await getWebMover(input.placeId);
      const [item] = await annotateDiscoveredMovers([candidate], actor);
      await locked((tx) => checkActor(tx, actor));
      return NextResponse.json(
        { item, prefill: discoveryPrefill(candidate) },
        { headers },
      );
    }
    if (input.action === "search") {
      const found = await searchNzbnMovers(input.query, input.page);
      const items = await annotateDiscoveredMovers(found.items, actor);
      await locked(async (tx) => {
        await checkActor(tx, actor);
        await audit(tx, actor.id, "mover_discovery_search", {
          provider: "NZBN",
          query: input.query,
          page: input.page,
          resultCount: items.length,
        });
      });
      return NextResponse.json(
        { items, page: input.page, hasMore: found.hasMore },
        { headers },
      );
    }
    const candidate = await getDiscoveredMover(input.nzbn);
    const [item] = await annotateDiscoveredMovers([candidate], actor);
    await locked(async (tx) => {
      await checkActor(tx, actor);
      await audit(tx, actor.id, "mover_discovery_review", {
        provider: "NZBN",
        nzbn: candidate.nzbn,
      });
    });
    return NextResponse.json(
      { item, prefill: discoveryPrefill(candidate) },
      { headers },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
