import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { getBusinessContent } from "@/lib/business-content";
import { getPublicMovers } from "@/lib/public-movers";
import { createPageMetadata } from "@/lib/seo";
export const metadata = createPageMetadata({
  title: "About Match 'n Move | Moving & Cleaning Quotes NZ",
  description:
    "How Match 'n Move connects customers with moving and cleaning companies, and our approach to clear information and customer choice.",
  path: "/about",
});
export default async function About() {
  const [business, movers] = await Promise.all([
    getBusinessContent(),
    getPublicMovers(),
  ]);
  return (
    <SiteShell>
      <main className="container-shell max-w-5xl py-12 sm:py-20">
        <p className="font-semibold text-teal-700">About Match &apos;n Move</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          A clearer starting point for your next move.
        </h1>
        <p className="mt-6 text-xl leading-8 text-slate-600">
          Moving involves enough decisions. Match &apos;n Move lets you describe
          your move once and request quotes from companies covering your area,
          with optional cleaning for the property you choose.
        </p>
        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          <section>
            <h2 className="text-2xl font-bold">For customers</h2>
            <p className="mt-3 leading-7 text-slate-600">
              The request is free and you do not have to accept an offer.
              Providers respond directly, so you can ask questions, compare the
              full scope and agree your booking and payment with your chosen
              company. Responses depend on coverage and availability.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-bold">For service providers</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Companies register, complete their profile and choose service
              areas. They can preview relevant enquiries and choose whether to
              unlock customer details at the displayed lead price. A lead is an
              introduction, with no guarantee of a booking.
            </p>
          </section>
        </div>
        <section className="mt-10 rounded-2xl bg-slate-50 p-6 sm:p-8">
          <h2 className="text-2xl font-bold">Transparency comes first</h2>
          <p className="mt-3 leading-7 text-slate-600">
            Company descriptions and service areas are supplied by providers. We
            explain recorded identity and contact checks separately from
            customer feedback. A profile check does not guarantee workmanship or
            insurance cover for your particular move.
          </p>
          <Link
            href="/trust"
            className="mt-4 inline-block py-2 font-semibold text-teal-700 underline"
          >
            Read what we check and how enquiries work
          </Link>
        </section>
        {business.operatorName && (
          <section className="mt-10">
            <h2 className="text-2xl font-bold">
              Who operates Match &apos;n Move
            </h2>
            <p className="mt-3 text-lg font-semibold">
              {business.operatorName}
            </p>
            {business.registrationNumber && (
              <p className="mt-2 text-slate-600">
                Business registration: {business.registrationNumber}
              </p>
            )}
            <p className="mt-4 whitespace-pre-line leading-7 text-slate-600">
              {business.introduction}
            </p>
            {business.team && (
              <p className="mt-4 whitespace-pre-line leading-7 text-slate-600">
                {business.team}
              </p>
            )}
          </section>
        )}
        {movers.length > 0 && (
          <p className="mt-8 text-slate-600">
            <Link href="/movers" className="underline">
              {movers.length} publicly listed moving{" "}
              {movers.length === 1 ? "company" : "companies"}
            </Link>{" "}
            in our directory. This is a directory count, not a completed-move
            total.
          </p>
        )}
        <section className="mt-10 border-t border-slate-200 pt-8">
          <h2 className="text-2xl font-bold">
            Questions or a problem with your request?
          </h2>
          <p className="mt-3 leading-7 text-slate-600">
            Contact us about quote details, a provider, cleaning, privacy or
            general help. Include your request reference when you have one.
          </p>
          <Link
            href="/contact"
            className="mt-5 inline-block rounded-xl bg-slate-950 px-6 py-3 font-semibold text-white"
          >
            Contact Match &apos;n Move
          </Link>
        </section>
      </main>
    </SiteShell>
  );
}
