"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Search, ExternalLink, LoaderCircle } from "lucide-react";
import type { DiscoveryCandidate } from "@/lib/mover-discovery";
import type { DiscoveryMatch } from "@/lib/mover-discovery-duplicates";
type Item = DiscoveryCandidate & { match: DiscoveryMatch };
export type DiscoveredProspectForm = {
  companyName: string;
  email: string;
  phone: string;
  website: string;
  contactName: string;
  operatingRegion: string;
  serviceAreas: string[];
  serviceTypes: string[];
  longDistance: boolean;
  consentBasis: string;
  consentEvidence: string;
  duplicateReviewNote: string;
  notes: string;
};
type Results = { items: Item[]; page: number; hasMore: boolean };
const field =
  "min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";
export function MoverDiscovery({
  onChoose,
}: {
  onChoose: (form: DiscoveredProspectForm) => void;
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("movers"),
    [city, setCity] = useState("Auckland"),
    [data, setData] = useState<Results | null>(null),
    [error, setError] = useState(""),
    [setup, setSetup] = useState(false),
    [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const lastQuery = useRef("movers");
  const lastCity = useRef("Auckland");
  async function request(body: unknown) {
    const response = await fetch("/api/admin/recruitment/discovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const value = await response.json();
    if (!response.ok) {
      setSetup(value.code === "SETUP_REQUIRED");
      throw Error(
        typeof value.error === "string"
          ? value.error
          : "The search provider could not be reached.",
      );
    }
    return value;
  }
  async function search(page = 1, paginating = false) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setSetup(false);
    setData(null);
    try {
      const term = paginating ? lastQuery.current : query.trim();
      const selectedCity = paginating ? lastCity.current : city.trim();
      const value = await request({
        action: "maps_search",
        query: term,
        city: selectedCity,
        page,
      });
      lastQuery.current = term;
      lastCity.current = selectedCity;
      setData(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search unavailable.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function choose(item: Item) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const value = await request({
        action: "maps_details",
        placeId: item.placeId,
      });
      if (
        value.item.inactive ||
        value.item.match.duplicate ||
        value.item.match.registered ||
        value.item.match.suppressed
      ) {
        setError(
          "This business is already tracked, registered, suppressed or inactive. Review the result before continuing.",
        );
        setData((current) =>
          current
            ? {
                ...current,
                items: current.items.map((i) =>
                  i.placeId === item.placeId ? value.item : i,
                ),
              }
            : current,
        );
        return;
      }
      onChoose(value.prefill);
      setOpen(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Business details unavailable.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="contents">
      <button
        type="button"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-teal-700 bg-white px-4 py-2 text-sm font-bold text-teal-800 disabled:opacity-50"
        disabled={busy}
        aria-expanded={open}
        aria-controls="mover-discovery-panel"
        onClick={() => {
          setOpen(!open);
        }}
      >
        <Search size={17} />
        Find movers online
      </button>
      {open && (
        <section
          id="mover-discovery-panel"
          className="mt-4 w-full rounded-2xl border border-teal-200 bg-white p-5 sm:p-6"
          aria-labelledby="mover-discovery-title"
        >
          <h2
            id="mover-discovery-title"
            className="text-xl font-bold text-slate-950"
          >
            Find moving companies by city
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Search Google Maps business listings through SerpApi. Choose a New
            Zealand city or town and try movers, removals or a company name.
            Review each business before adding it. Search location does not
            confirm service coverage, and listings may include nearby areas.
          </p>
          <form
            className="mt-4 flex flex-wrap gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void search();
            }}
          >
            <label
              className="min-w-0 flex-1 text-sm font-semibold"
              htmlFor="discovery-city"
            >
              City or town
              <input
                id="discovery-city"
                className={field + " mt-2 w-full"}
                list="discovery-cities"
                minLength={2}
                maxLength={80}
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <datalist id="discovery-cities">
                {[
                  "Auckland",
                  "Wellington",
                  "Christchurch",
                  "Hamilton",
                  "Tauranga",
                  "Dunedin",
                  "Queenstown",
                  "Whangarei",
                  "Rotorua",
                  "Napier",
                  "Hastings",
                  "New Plymouth",
                  "Palmerston North",
                  "Nelson",
                  "Invercargill",
                ].map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </label>
            <label
              className="min-w-0 flex-1 text-sm font-semibold"
              htmlFor="discovery-query"
            >
              Company name or keyword
              <input
                id="discovery-query"
                className={field + " mt-2 w-full"}
                minLength={2}
                maxLength={80}
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button
              disabled={
                busy || query.trim().length < 2 || city.trim().length < 2
              }
              className="inline-flex min-h-11 items-center gap-2 self-end rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
              Search movers
            </button>
          </form>
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950"
            >
              {error}
            </p>
          )}
          {setup && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <p className="font-semibold">One-time owner setup</p>
              <p className="mt-2">
                Create a SerpApi account and add its API key to the hosting
                environment as <code>SERPAPI_API_KEY</code>, then restart or
                redeploy the app. Keep the key in server settings. NZBN access
                is not required for online discovery.
              </p>
              <a
                href="https://serpapi.com/manage-api-key"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-teal-800 underline"
              >
                Open SerpApi key setup <ExternalLink size={15} />
              </a>
            </div>
          )}
          {busy && (
            <p className="mt-4 text-sm text-slate-600" role="status">
              Looking up business listings...
            </p>
          )}
          {data && (
            <>
              <p className="mt-5 text-sm text-slate-600" role="status">
                {data.items.length} results for {lastQuery.current} in{" "}
                {lastCity.current}, page {data.page}. Missing contact
                information can be completed during review.
              </p>
              {!data.items.length && (
                <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-700">
                  No usable results on this page. Try another city, business
                  name or keyword.
                </p>
              )}
              <div className="mt-4 space-y-3">
                {data.items.map((item) => {
                  const blocked =
                    item.inactive ||
                    item.match.registered ||
                    item.match.duplicate ||
                    item.match.suppressed;
                  return (
                    <article
                      key={item.placeId}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-950">
                            {item.companyName}
                          </h3>
                          <p className="mt-2 text-xs text-slate-600">
                            {item.category ? item.category + " - " : ""}
                            {item.status}
                          </p>
                          {item.phone && (
                            <p className="mt-2 text-sm text-slate-600">
                              Phone: {item.phone}
                            </p>
                          )}
                          {item.website && (
                            <a
                              href={item.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm text-teal-800 underline"
                            >
                              Company website <ExternalLink size={14} />
                            </a>
                          )}
                          {item.tradingNames.length > 0 && (
                            <p className="mt-2 text-sm text-slate-600">
                              Trading names: {item.tradingNames.join(", ")}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                            {item.match.registered && (
                              <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-800">
                                Registered mover match
                              </span>
                            )}
                            {item.match.duplicate && (
                              <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-900">
                                Already in outreach
                              </span>
                            )}
                            {item.match.suppressed && (
                              <span className="rounded-full bg-red-50 px-3 py-1 text-red-800">
                                Contact suppressed
                              </span>
                            )}
                            {item.inactive && (
                              <span className="rounded-full bg-slate-100 px-3 py-1">
                                Inactive / status needs review
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {item.match.existingId && (
                            <Link
                              href={
                                "/admin/recruitment/prospects?id=" +
                                encodeURIComponent(item.match.existingId)
                              }
                              className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-teal-800 underline"
                            >
                              Open company
                            </Link>
                          )}
                          <button
                            type="button"
                            disabled={busy || blocked}
                            onClick={() => void choose(item)}
                            className="min-h-11 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
                          >
                            Review &amp; add
                          </button>
                        </div>
                      </div>
                      <a
                        href={item.registryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm text-teal-800 underline"
                      >
                        View Google Maps listing <ExternalLink size={14} />
                      </a>
                    </article>
                  );
                })}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  className={field}
                  disabled={busy || data.page === 1}
                  onClick={() => void search(data.page - 1, true)}
                >
                  Previous page
                </button>
                <span className="text-sm text-slate-600">
                  Google Maps via SerpApi · page {data.page}
                </span>
                <button
                  type="button"
                  className={field}
                  disabled={busy || !data.hasMore || data.page >= 6}
                  onClick={() => void search(data.page + 1, true)}
                >
                  Next page
                </button>
              </div>
            </>
          )}
          <p className="mt-5 border-t border-slate-200 pt-4 text-xs leading-6 text-slate-600">
            Review &amp; add opens the existing company form. Confirm the
            available contact details and service coverage, and mark missing
            contact details for follow-up before saving. New prospects
            belong to the administrator who saves them. Contact permission
            remains Unknown until separately reviewed; discovery creates no
            accounts and sends no emails. Business emails must be confirmed
            separately. Searches, result pages and listing reviews each use a
            provider request; the team has a shared daily limit.
          </p>
        </section>
      )}
    </div>
  );
}
