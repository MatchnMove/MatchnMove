import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { createPageMetadata } from "@/lib/seo";
import { SITE_EMAILS, toMailto } from "@/lib/site-emails";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy",
  description: "How Match 'n Move collects, uses, protects, and shares information submitted with moving and optional cleaning quote requests.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <SiteShell>
      <section className="bg-white">
        <div className="container-shell py-14 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-4xl rounded-[32px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6 shadow-sm sm:p-8 lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-700">Privacy</p>
            <h1 className="mt-4 text-[clamp(2.2rem,6vw,4rem)] font-black leading-[0.95] tracking-[-0.05em] text-slate-950">
              Data consent & privacy
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
              Match &apos;n Move uses the information you submit to connect you with relevant moving companies and, only when
              you deliberately request it, suitable cleaning companies. We minimise what each provider can see and keep
              cleaning requests separate from mover-only information.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-slate-900">What we collect</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Contact details, move dates, origin and destination information, home size, and notes that help
                  providers prepare an accurate quote. We also remember a chosen interface language for convenience.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-slate-900">How it is used</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Moving information is shared with relevant moving partners. If you opt in to cleaning quotes, a cleaning
                  request is matched from the pickup region and contains only the pickup property details needed for that
                  service, not your destination or detailed moving inventory. Free-form cleaning notes are released only
                  after the assigned cleaner unlocks the lead.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-slate-900">Your choices</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  You can contact us to update or remove your information, or to ask how your quote request data has
                  been handled.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-slate-900">Need help?</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  For privacy questions, reach out to{" "}
                  <Link href={toMailto(SITE_EMAILS.privacy)} className="font-semibold text-sky-700 hover:text-sky-800">
                    {SITE_EMAILS.privacy}
                  </Link>
                  .
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-slate-900">How cleaning lead privacy works</h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">
                <p>
                  Before a cleaning company opens a matched lead, it sees only a general location, region, property type,
                  bedroom count, preferred date, flexibility, and when the request arrived. Free-form notes stay locked
                  because they can include contact details.
                </p>
                <p>
                  Your name, email, phone number, full pickup street address, and postcode stay locked until that assigned
                  cleaning company actively opens the lead. Cleaning companies cannot access leads assigned to another company.
                </p>
                <p>
                  Cleaner lead purchase and invoice records are retained as business transaction and audit records. Customers
                  request cleaning quotes for free; any lead fee is charged to the cleaning company, not the customer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
