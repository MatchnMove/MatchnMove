import Link from "next/link";
import { getPublicMovers } from "@/lib/public-movers";
import { PublicMoverCard } from "@/components/public-mover-card";
export async function MoverReviewsShowcase() {
  const reviewed = (await getPublicMovers())
    .filter((mover) => mover.totalReviewCount > 0)
    .slice(0, 3);
  return (
    <section
      id="mover-reviews"
      className="bg-slate-950 py-12 text-white sm:py-16"
    >
      <div className="container-shell">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-200">
              Know who you are comparing
            </p>
            <h2 className="mt-3 text-3xl font-bold">
              Clear information. Informed decisions.
            </h2>
          </div>
          <Link
            href="/trust"
            className="py-3 font-semibold text-teal-200 underline underline-offset-4"
          >
            What we check
          </Link>
        </div>
        {reviewed.length > 0 ? (
          <div className="mt-8 grid items-start gap-5 md:grid-cols-3">
            {reviewed.map((mover) => (
              <PublicMoverCard key={mover.id} mover={mover} />
            ))}
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              [
                "Relevant companies",
                "Enquiries are matched by service area. Availability and the number of responses vary.",
              ],
              [
                "Information with context",
                "Business identity and contact checks are explained separately from company-supplied descriptions and customer reviews.",
              ],
              [
                "You stay in control",
                "Review each company's quote, terms and cover before agreeing a booking directly with them.",
              ],
            ].map(([title, text]) => (
              <div
                key={title}
                className="rounded-2xl border border-white/15 p-6"
              >
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="mt-3 leading-7 text-slate-300">{text}</p>
              </div>
            ))}
          </div>
        )}
        <Link
          href="/movers"
          className="mt-7 inline-block py-3 font-semibold text-teal-200 underline underline-offset-4"
        >
          Explore moving company profiles
        </Link>
      </div>
    </section>
  );
}
