import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { createPageMetadata } from "@/lib/seo";
export const metadata = createPageMetadata({
  title: "Moving & Cleaning Quotes NZ | Move-out and Move-in Cleaning",
  description:
    "Add optional end-of-tenancy, move-out or move-in cleaning to your moving quote request. Select services, the property to clean and flexible scheduling.",
  path: "/cleaning-quotes",
});
const questions = [
  [
    "Can I choose my new home?",
    "Yes. Choose move-in cleaning and explicitly authorise the destination property. Cleaners for this enquiry receive that property only.",
  ],
  [
    "What if I need both properties cleaned?",
    "Each request currently supports one cleaning property. Contact support with your request reference to discuss the second property.",
  ],
  [
    "Do I need a confirmed date?",
    "No. You can leave the date open and choose a flexible time window. Tell the cleaner about key handover and whether cleaning needs to happen before or after movers.",
  ],
  [
    "Are moving and cleaning booked together?",
    "They are separate provider services. Request them together, then confirm price, scope, availability and bookings directly with each company. Responses are not guaranteed.",
  ],
  [
    "What does a cleaner see?",
    "The preview includes general location, selected services, property information and schedule preferences. A recorded purchase unlocks contact details, the selected property's exact address and your cleaning notes. The other address and moving inventory are not shared.",
  ],
  [
    "Is requesting quotes free?",
    "Yes. You can choose whether to accept any offer. Cleaning remains optional and is only requested when you select it and consent to sharing.",
  ],
];
export default function Cleaning() {
  return (
    <SiteShell>
      <main>
        <section className="bg-slate-950 py-14 text-white sm:py-20">
          <div className="container-shell max-w-5xl">
            <p className="font-semibold text-teal-200">
              Moving quotes + optional cleaning
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
              Moving house? Get the clean sorted too.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              One starting process for the move and the clean. Request moving
              quotes, then add cleaning for your old place or new home without
              entering the same property details again.
            </p>
            <Link
              className="mt-7 inline-block rounded-xl bg-teal-300 px-6 py-4 font-semibold text-slate-950"
              href="/quote?cleaning=1"
            >
              Start moving &amp; cleaning quotes
            </Link>
            <p className="mt-4 text-sm text-slate-300">
              Free to request &middot; optional cleaning &middot; no obligation
            </p>
          </div>
        </section>
        <div className="container-shell max-w-5xl py-12">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              [
                "Moving out",
                "Choose end-of-tenancy, general move-out or deep cleaning. Confirm what your tenancy or property handover needs with your cleaner.",
              ],
              [
                "Moving in",
                "Plan a clean before unpacking. Select the destination and give permission to share that property with relevant cleaners.",
              ],
              [
                "Specialist requirements",
                "Choose oven, carpet, window, kitchen and bathroom cleaning, or add other requirements. Providers confirm which services they can offer.",
              ],
            ].map(([title, text]) => (
              <section
                className="rounded-2xl border border-slate-200 p-6"
                key={title}
              >
                <h2 className="text-xl font-bold">{title}</h2>
                <p className="mt-3 leading-7 text-slate-600">{text}</p>
              </section>
            ))}
          </div>
          <section className="mt-10 rounded-2xl bg-teal-50 p-7">
            <h2 className="text-2xl font-bold">
              Plan the handover, not just the date.
            </h2>
            <p className="mt-4 leading-7 text-slate-700">
              Tell cleaners whether the property will be empty, your preferred
              date or flexible window, and whether cleaning should happen before
              or after the movers. Add parking, stairs or key arrangements
              privately. Confirm timing directly before booking.
            </p>
          </section>
          <section className="mt-10">
            <h2 className="text-3xl font-bold">How the shared request works</h2>
            <ol className="mt-5 list-decimal space-y-3 pl-6 leading-7 text-slate-600">
              <li>Enter pickup, destination and moving requirements.</li>
              <li>
                In the final step, choose optional cleaning, its services and
                the property to clean.
              </li>
              <li>
                Consent to sharing. Relevant providers can respond directly with
                separate quotes.
              </li>
            </ol>
          </section>
          <section className="mt-12">
            <h2 className="text-3xl font-bold">Cleaning quote questions</h2>
            <div className="mt-5 space-y-3">
              {questions.map(([q, a]) => (
                <details
                  className="rounded-xl border border-slate-200 p-5"
                  key={q}
                >
                  <summary className="cursor-pointer font-semibold">
                    {q}
                  </summary>
                  <p className="mt-3 leading-7 text-slate-600">{a}</p>
                </details>
              ))}
            </div>
          </section>
          <div className="mt-10 flex flex-wrap gap-5">
            {[
              ["/quote?cleaning=1", "Start your request"],
              ["/trust", "How information is shared"],
              [
                "/resources/move-out-cleaning-checklist-nz",
                "Move-out cleaning checklist",
              ],
              ["/cleaner/partner", "For cleaning companies"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="py-3 font-semibold text-teal-700 underline"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </main>
    </SiteShell>
  );
}
