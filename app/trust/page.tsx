import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { createPageMetadata } from "@/lib/seo";
export const metadata = createPageMetadata({
  title: "Why Trust Match 'n Move? | Our Process & Provider Checks",
  description:
    "Understand provider checks, customer reviews, how your moving and cleaning information is shared, and where to get help.",
  path: "/trust",
});
const sections = [
  [
    "What we do",
    "Match 'n Move is a quote-request and lead-introduction platform. Requesting quotes is free for customers, with no obligation to accept an offer. Moving and cleaning companies decide whether they can quote. We do not guarantee a number of responses or a response time.",
  ],
  [
    "How providers participate",
    "Companies create an account, supply business and service information and choose coverage areas. Eligible companies can preview matched enquiries. Purchasing access reveals customer contact details for the relevant job. Providers pay the displayed lead price; this does not buy a recommendation or a customer rating.",
  ],
  [
    "Business identity",
    "An identity check means the recorded business details have passed our NZBN or document review process. It does not certify service quality. A profile without an identity label should not be assumed to have passed that check.",
  ],
  [
    "Contact details",
    "An email-confirmed label records email verification. A phone-confirmed label records phone verification. These checks establish control of a contact channel, not the quality of a moving service.",
  ],
  [
    "Company-supplied information and insurance",
    "Descriptions, coverage and services come from the company. Ask your chosen provider about insurance, exclusions, excesses and whether cover applies to your goods and route. Even where documents have been reviewed, cover can have conditions or change.",
  ],
  [
    "Customer reviews",
    "Review invitations use a private, single-use link associated with a real enquiry and provider lead. One review is permitted per lead. Public ratings use approved records only. This association is not independent proof that a move was completed. Reviews can be reported for moderation; we do not create or buy reviews.",
  ],
  [
    "Your information",
    "Moving companies receive moving-job information. Optional cleaning is a separate enquiry for the pickup or destination property you authorise. Cleaners do not receive the other property's address or your moving inventory. Exact addresses and contact information are withheld from the cleaner lead preview until access is purchased.",
  ],
  [
    "Quotes, bookings and payments",
    "Provider quotes are exchanged directly by email or phone. Match 'n Move does not currently compare offers inside a customer dashboard or take customer payments for moving or cleaning bookings. Check the quote, cancellation terms, access requirements and cover before agreeing directly with a provider.",
  ],
  [
    "Help when something goes wrong",
    "Contact Match 'n Move about incorrect request details, inappropriate reviews, provider information or privacy concerns. Include a request reference where possible. We can review platform records and support enquiries; a provider remains responsible for the services you agree with them.",
  ],
];
export default function Trust() {
  return (
    <SiteShell>
      <main className="container-shell max-w-4xl py-12 sm:py-20">
        <p className="font-semibold text-teal-700">Trust &amp; transparency</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          Know how Match &apos;n Move works.
        </h1>
        <p className="mt-5 text-xl leading-8 text-slate-600">
          Clear information helps you make a confident choice. Here is what our
          platform does, what we check and what to ask your provider.
        </p>
        <div className="mt-10 space-y-8">
          {sections.map(([title, text]) => (
            <section key={title}>
              <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
              <p className="mt-3 leading-7 text-slate-600">{text}</p>
            </section>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-5 border-t border-slate-200 pt-6">
          {[
            ["/contact", "Contact support"],
            ["/privacy", "Privacy policy"],
            ["/terms", "Terms"],
            ["/quote", "Request quotes"],
          ].map(([href, text]) => (
            <Link
              key={href}
              href={href}
              className="py-2 font-semibold text-teal-700 underline"
            >
              {text}
            </Link>
          ))}
        </div>
      </main>
    </SiteShell>
  );
}
