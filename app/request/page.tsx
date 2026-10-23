import Link from "next/link";
import { getCustomerRequest, requestReference } from "@/lib/customer-access";
import { SiteShell } from "@/components/site-shell";
import { CustomerRequestActions } from "@/components/customer-request-actions";
import { inventorySchema } from "@/lib/inventory";
import {
  CLEANING_SERVICES,
  formatCleaningChoice,
} from "@/lib/cleaning-request";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your Request | Match 'n Move",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function RequestPage() {
  const quote = await getCustomerRequest();
  const inventory = inventorySchema.safeParse(quote?.inventory);
  return (
    <SiteShell>
      <main className="container-shell max-w-4xl py-12">
        <h1 className="text-3xl font-bold">Your moving request</h1>
        {!quote ? (
          <div className="mt-6">
            <p className="leading-7 text-slate-600">
              Open your private return link or use the browser where you
              submitted the request. Request IDs alone cannot provide access.
            </p>
            <Link
              href="/contact"
              className="mt-5 inline-block text-teal-700 underline"
            >
              Get help with your request
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-4 break-all text-sm font-semibold text-teal-700">
              {requestReference(quote.id)}
            </p>
            <p className="mt-3 text-slate-600">
              Received {quote.createdAt.toLocaleDateString("en-NZ")}
            </p>
            <section className="mt-7 rounded-2xl bg-teal-50 p-6">
              <h2 className="text-xl font-bold">
                {quote.leads.length
                  ? "Shared with " +
                    quote.leads.length +
                    " moving " +
                    (quote.leads.length === 1 ? "company" : "companies")
                  : "Received \u00b7 no matching moving company assigned"}
              </h2>
              <p className="mt-3 leading-7 text-slate-700">
                Companies can review your enquiry and choose to contact you
                directly. Availability and responses vary. Quotes are exchanged
                by email or phone; this page does not display or compare
                provider offers.
              </p>
              <p className="mt-3 text-sm text-slate-600">
                {quote.leads.filter((lead) => lead.purchasedAt).length} moving
                companies have unlocked contact details. This does not confirm
                an accepted booking.
              </p>
            </section>
            <section className="mt-7 rounded-2xl border border-slate-200 p-6">
              <h2 className="text-2xl font-bold">Submitted details</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                {[
                  ["Pickup", quote.fromAddress],
                  ["Destination", quote.toAddress],
                  [
                    "Moving date",
                    quote.moveDate
                      ? quote.moveDate.toLocaleDateString("en-NZ")
                      : "Not confirmed",
                  ],
                  ["Date flexible", quote.dateFlexible ? "Yes" : "No"],
                  ["Contact", quote.name],
                  ["Email", quote.email],
                  ["Phone", quote.phone],
                  [
                    "Property",
                    quote.fromPropertyType +
                      " \u00b7 " +
                      quote.bedrooms +
                      " bedrooms",
                  ],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-sm font-semibold text-slate-500">
                      {k}
                    </dt>
                    <dd className="mt-1 break-words">{v}</dd>
                  </div>
                ))}
              </dl>
              {quote.movingWhat && (
                <p className="mt-5 whitespace-pre-line leading-7 text-slate-600">
                  {quote.movingWhat}
                </p>
              )}
            </section>
            {inventory.success && inventory.data.length > 0 && (
              <section className="mt-7 rounded-2xl border border-slate-200 p-6">
                <h2 className="text-2xl font-bold">Submitted inventory</h2>
                <ul className="mt-4 space-y-3">
                  {inventory.data.map((item) => (
                    <li key={item.id} className="text-sm leading-6">
                      <strong>
                        {item.room}: {item.label} x{item.quantity}
                      </strong>
                      {item.notes && (
                        <p className="whitespace-pre-line text-slate-600">
                          {item.notes}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section className="mt-7 rounded-2xl border border-slate-200 p-6">
              <h2 className="text-2xl font-bold">Cleaning</h2>
              {quote.cleaningRequest ? (
                <>
                  <p className="mt-3 font-semibold">
                    {quote.cleaningRequest.location === "MOVE_IN"
                      ? "Move-in \u00b7 destination property"
                      : "Move-out \u00b7 pickup property"}
                  </p>
                  <p className="mt-3 leading-7 text-slate-600">
                    {quote.cleaningRequest.services
                      .map(
                        (s) =>
                          CLEANING_SERVICES[
                            s as keyof typeof CLEANING_SERVICES
                          ] ?? s,
                      )
                      .join(" \u00b7 ") || "General cleaning requirements"}
                  </p>
                  <p className="mt-3 text-slate-600">
                    {quote.cleaningRequest.leads.length} cleaning companies
                    assigned.{" "}
                    {
                      quote.cleaningRequest.leads.filter((l) => l.purchase)
                        .length
                    }{" "}
                    have unlocked contact details.
                  </p>
                  <p className="mt-3 text-sm text-slate-600">
                    Preferred date:{" "}
                    {quote.cleaningRequest.preferredDate?.toLocaleDateString(
                      "en-NZ",
                    ) ?? "Not confirmed"}{" "}
                    &middot; time:{" "}
                    {formatCleaningChoice(quote.cleaningRequest.timeWindow)}
                  </p>
                  <p className="mt-3 text-sm text-slate-600">
                    Property empty:{" "}
                    {formatCleaningChoice(quote.cleaningRequest.propertyEmpty)}.
                    Timing:{" "}
                    {formatCleaningChoice(quote.cleaningRequest.moverTiming)}.
                    {quote.cleaningRequest.carpetRooms
                      ? " Carpeted rooms: " +
                        quote.cleaningRequest.carpetRooms +
                        "."
                      : ""}
                  </p>
                  {quote.cleaningRequest.accessNotes && (
                    <p className="mt-3 whitespace-pre-line text-sm text-slate-600">
                      Access: {quote.cleaningRequest.accessNotes}
                    </p>
                  )}
                  {quote.cleaningRequest.notes && (
                    <p className="mt-3 whitespace-pre-line text-slate-600">
                      {quote.cleaningRequest.notes}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-3 text-slate-600">
                  No cleaning enquiry requested.
                </p>
              )}
            </section>
            <CustomerRequestActions />
            {quote.supportRequests.length > 0 && (
              <section className="mt-7">
                <h2 className="text-xl font-bold">Support requests</h2>
                {quote.supportRequests.map((r) => (
                  <p
                    key={r.id}
                    className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm"
                  >
                    {r.createdAt.toLocaleDateString("en-NZ")} &middot;{" "}
                    {r.status === "RESOLVED" ? "Reviewed" : "Awaiting review"}
                    <br />
                    {r.message}
                  </p>
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </SiteShell>
  );
}
