"use client";

import { useEffect, useRef, useState } from "react";

export type RecipientCompany = {
  id: string;
  companyName: string;
  businessType?: string;
  email: string | null;
  contactName: string | null;
  consentBasis: string;
  consentEvidence: string | null;
};

export function CompanyRecipientPicker({ initialId = "", initialSearch = "", value, onChange }: {
  initialId?: string;
  initialSearch?: string;
  value: string;
  onChange: (company: RecipientCompany | null) => void;
}) {
  const [search, setSearch] = useState(initialSearch);
  const [results, setResults] = useState<{ items: RecipientCompany[]; count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const allowInitialSelection = useRef(true);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/recruitment?view=prospects&sort=name&q=${encodeURIComponent(search.trim())}`, { cache: "no-store", signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Could not search companies.");
        if (active) setResults(body);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Could not search companies.");
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [search, retry]);
  useEffect(() => {
    if (!initialId) return;
    let active = true;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/admin/recruitment?view=prospect&id=${encodeURIComponent(initialId)}`, { cache: "no-store", signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Could not load selected company.");
        if (active && allowInitialSelection.current) onChange(body);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load selected company.");
      }
    })();
    return () => { active = false; controller.abort(); };
  }, [initialId, onChange]);
  return <div className="space-y-2">
    <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
      <span>Find a company</span>
      <input type="search" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" placeholder="Search company name or email" value={search} aria-controls="recipient-company-results" onChange={event => { allowInitialSelection.current = false; setSearch(event.target.value); setLoading(true); onChange(null); }} />
    </label>
    <p className="text-xs text-slate-500">Search saved companies, then select a recipient below.</p>
    <div role="status" className="text-xs text-slate-600">{loading ? "Searching companies…" : error ? "Company search unavailable." : results?.count ? `${results.count} ${results.count === 1 ? "company found" : "companies found"}${results.count > 50 ? ". Showing the first 50; narrow your search." : "."}` : "No saved companies match. Try another name or email, or add the company."}</div>
    {error && <div role="alert" className="text-sm text-red-700">{error} <button type="button" className="font-semibold underline" onClick={() => setRetry(retry + 1)}>Try again</button></div>}
    <div id="recipient-company-results" role="group" aria-label="Matching companies" aria-busy={loading} className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
      {!loading && !error && results?.items.map(company => <button key={company.id} type="button" aria-pressed={value === company.id} onClick={() => { allowInitialSelection.current = false; onChange(company); }} className={`block w-full border-b border-slate-100 px-4 py-3 text-left text-sm last:border-b-0 hover:bg-teal-50 focus-visible:outline-teal-700 ${value === company.id ? "bg-teal-50 ring-1 ring-inset ring-teal-600" : "bg-white"}`}>
        <span className="block font-semibold text-slate-900">{company.companyName}</span>
        <span className="block text-xs text-teal-700">{company.businessType === "CLEANING" ? "Cleaning company" : "Moving company"}</span>
        <span className={`mt-1 block break-all text-xs ${company.email ? "text-slate-600" : "text-amber-800"}`}>{company.email || "Missing email — follow-up required before preparing an email"}</span>
      </button>)}
    </div>
  </div>;
}
