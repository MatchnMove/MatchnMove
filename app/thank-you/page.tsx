import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { getCustomerRequest, requestReference } from "@/lib/customer-access";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Request Confirmation | Match 'n Move",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function Thanks() {
  const quote = await getCustomerRequest();
  return (
    <SiteShell>
      <main className="container-shell max-w-3xl py-16">
        <p className="font-semibold text-teal-700">Match &apos;n Move</p>
        <h1 className="mt-3 text-4xl font-bold">
          {quote
            ? "Your request has been received."
            : "View your request securely."}
        </h1>
        {quote ? (
          <>
            <p className="mt-5 break-all font-semibold">
              {requestReference(quote.id)}
            </p>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Suitable companies can review your moving enquiry
              {quote.cleaningRequest
                ? " and your separate cleaning enquiry"
                : ""}
              . Responses depend on provider availability. Companies contact you
              directly by email or phone, and you can choose whether to accept
              any quote.
            </p>
            <ol className="mt-7 list-decimal space-y-3 pl-6 leading-7 text-slate-600">
              <li>Check your submitted details and keep your reference.</li>
              <li>
                Discuss scope, pricing and terms with companies that respond.
              </li>
              <li>
                Confirm any booking directly with the provider you choose.
              </li>
            </ol>
            <Link
              href="/request"
              className="mt-7 inline-block rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white"
            >
              View request &amp; create a private return link
            </Link>
          </>
        ) : (
          <p className="mt-5 leading-7 text-slate-600">
            Use the browser where you submitted your enquiry or open your
            private return link. A reference in a URL does not prove a request
            was submitted.
          </p>
        )}
        <div className="mt-8 flex flex-wrap gap-5">
          <Link href="/contact" className="text-teal-700 underline">
            Request support
          </Link>
          <Link
            href="/resources/moving-house-checklist"
            className="text-teal-700 underline"
          >
            Plan your checklist
          </Link>
        </div>
      </main>
    </SiteShell>
  );
}
