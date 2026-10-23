import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuthenticatedMover } from "@/lib/mover-profile";
import { prisma } from "@/lib/db";
import { MoverReviewResponses } from "@/components/mover-review-responses";
export const metadata = {
  title: "Respond to Reviews | Match 'n Move",
  robots: { index: false, follow: false },
};
export default async function Responses() {
  const mover = await requireAuthenticatedMover();
  if (!mover) redirect("/mover/login?next=/mover/reviews");
  const reviews = await prisma.review.findMany({
    where: { moverCompanyId: mover.id },
    orderBy: { submittedAt: "desc" },
    take: 50,
    select: {
      id: true,
      overallRating: true,
      writtenReview: true,
      providerResponse: true,
      responseApprovedAt: true,
    },
  });
  return (
    <main className="container-shell max-w-4xl py-12">
      <Link href="/mover/dashboard" className="text-teal-700 underline">
        Back to dashboard
      </Link>
      <h1 className="mt-6 text-3xl font-bold">
        Customer reviews &amp; company responses
      </h1>
      <MoverReviewResponses
        reviews={reviews.map((r) => ({
          id: r.id,
          rating: r.overallRating,
          text: r.writtenReview,
          response: r.providerResponse,
          approved: Boolean(r.responseApprovedAt),
        }))}
      />
    </main>
  );
}
