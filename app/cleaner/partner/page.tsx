import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { formatCleaningLeadPrice } from "@/lib/cleaner-lead-pricing";
import { createPageMetadata } from "@/lib/seo";
export const metadata = createPageMetadata({
  title: "Cleaning Company Partners NZ | Enquiries & Pricing",
  description:
    "How cleaning companies register, receive relevant move-out and move-in enquiries, unlock customer details and pay monthly lead invoices.",
  path: "/cleaner/partner",
});
export default function Partner() {
  return (
    <SiteShell>
      <main className="container-shell max-w-4xl py-12 sm:py-20">
        <p className="font-semibold text-teal-700">For cleaning companies</p>
        <h1 className="mt-3 text-4xl font-bold">
          Cleaning enquiries from people planning a move.
        </h1>
        <p className="mt-5 text-lg leading-8 text-slate-600">
          Create a free cleaner account, confirm your email and complete your
          company details and service regions. Accounts require activation
          before receiving enquiries.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {[
            [
              "Relevant enquiries",
              "Active cleaners are matched to the selected cleaning property's service area. Customers may request end-of-tenancy, move-out, move-in or specialist cleaning. Confirm which services your business offers.",
            ],
            [
              "Preview before unlocking",
              "See a general location, property information, selected services and scheduling preferences. Exact addresses, contact details and private notes are withheld until you choose to unlock.",
            ],
            [
              "Clear lead price",
              formatCleaningLeadPrice() +
                " NZD per unlocked cleaning lead. The dashboard shows the price before purchase. Opening an enquiry does not guarantee a booking.",
            ],
            [
              "Monthly billing",
              "Unlocked leads are recorded once and grouped into monthly invoices. Registration has no ongoing membership fee. Review invoices in your cleaner dashboard and contact support about an unsuitable or invalid enquiry.",
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
        <p className="mt-7 leading-7 text-slate-600">
          Lead volume depends on customer demand and your coverage. Manage
          coverage in your profile, and agree your own service quotes, scope and
          booking terms directly with customers.
        </p>
        <div className="mt-7 flex flex-wrap gap-5">
          <Link
            href="/cleaner/register"
            className="rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white"
          >
            Register as a cleaner
          </Link>
          <Link
            href="/cleaner/login"
            className="rounded-xl border border-slate-300 px-6 py-3 font-semibold"
          >
            Cleaner login
          </Link>
          <Link
            href="/contact"
            className="py-3 font-semibold text-teal-700 underline"
          >
            Partner support
          </Link>
        </div>
      </main>
    </SiteShell>
  );
}
