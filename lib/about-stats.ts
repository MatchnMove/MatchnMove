import { prisma } from "@/lib/db";
import { getPublicMovers } from "@/lib/public-movers";
/** Directory count uses the same eligibility rules as public listings.
 * The second value counts submitted requests, never completed moves or bookings. */
export async function getAboutPageStats() {
  const movers = await getPublicMovers();
  const submittedRequests = await prisma.quoteRequest.count().catch(() => 0);
  return [movers, submittedRequests, movers.length] as const;
}
