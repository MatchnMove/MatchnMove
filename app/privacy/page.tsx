import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { SITE_EMAILS, toMailto } from "@/lib/site-emails";

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
              Match &apos;n Move uses the information you submit to connect you with relevant moving companies, support quote
              comparisons, and improve the quality of our marketplace. We keep collection focused on what is necessary
              to help customers move and to help movers respond with accurate pricing.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-slate-900">What we collect</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Contact details, move dates, origin and destination information, home size, and notes that help
                  movers prepare an accurate quote.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-slate-900">How it is used</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Your information is shared only with relevant moving partners and used internally to maintain site
                  functionality, reduce spam, and improve marketplace quality.
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
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
