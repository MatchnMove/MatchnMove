"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, ShieldCheck, Star } from "lucide-react";
import {
  AddressAutocomplete,
  AddressSuggestion
} from "@/components/address-autocomplete";
import { addressSuggestionToValue } from "@/lib/address-search";
import { trackAnalyticsEvent } from "@/lib/analytics";

type AddressState = {
  address: string;
  city: string;
  region: string;
  postcode: string;
  country: string;
};

const emptyAddress: AddressState = {
  address: "",
  city: "",
  region: "",
  postcode: "",
  country: "New Zealand"
};

const buildAddressState = (suggestion: AddressSuggestion): AddressState => ({
  address: addressSuggestionToValue(suggestion),
  city: suggestion.city,
  region: suggestion.region,
  postcode: suggestion.postcode,
  country: suggestion.country || "New Zealand"
});

export function HeroQuoteCard() {
  const [from, setFrom] = useState<AddressState>(emptyAddress);
  const [to, setTo] = useState<AddressState>(emptyAddress);
  const [errors, setErrors] = useState<{ from?: string; to?: string }>({});
  const [started, setStarted] = useState(false);

  const trackStart = () => {
    if (started) {
      return;
    }

    setStarted(true);
    trackAnalyticsEvent("quote_start", {
      source: "homepage_hero",
    });
  };

  const updateFromAddress = (address: string) => {
    setFrom((current) => ({ ...current, address }));
    setErrors((current) => ({ ...current, from: undefined }));
  };

  const updateToAddress = (address: string) => {
    setTo((current) => ({ ...current, address }));
    setErrors((current) => ({ ...current, to: undefined }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    trackStart();

    const nextErrors = {
      from: from.address.trim() ? undefined : "Enter your pickup address to start.",
      to: to.address.trim() ? undefined : "Enter your drop-off address to continue."
    };

    if (nextErrors.from || nextErrors.to) {
      setErrors(nextErrors);
      trackAnalyticsEvent("quote_route_validation_error", {
        source: "homepage_hero",
        missing_from: Boolean(nextErrors.from),
        missing_to: Boolean(nextErrors.to),
      });
      return;
    }

    const params = new URLSearchParams({
      fromAddress: from.address.trim(),
      fromCity: from.city,
      fromRegion: from.region,
      fromPostcode: from.postcode,
      fromCountry: from.country || "New Zealand",
      toAddress: to.address.trim(),
      toCity: to.city,
      toRegion: to.region,
      toPostcode: to.postcode,
      toCountry: to.country || "New Zealand"
    });
    const currentParams = new URLSearchParams(window.location.search);
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"]) {
      const value = currentParams.get(key);
      if (value) params.set(key, value);
    }

    trackAnalyticsEvent("quote_route_complete", {
      source: "homepage_hero",
      from_region: from.region || undefined,
      to_region: to.region || undefined,
    });

    window.location.href = `/quote?${params.toString()}`;
  };

  return (
    <form
      onSubmit={submit}
      className="relative z-20 w-full overflow-visible rounded-[22px] border border-white/70 bg-white/95 p-3 text-left text-slate-950 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:rounded-[26px] sm:p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[0.98rem] font-extrabold leading-tight tracking-[-0.02em] text-slate-950 sm:text-[1.2rem]">
          Where are you moving?
        </h2>
        <div className="hidden items-center gap-1 text-xs font-bold text-slate-500 min-[380px]:flex">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          Details kept private
        </div>
      </div>

      <div className="mt-2.5 grid gap-2 sm:gap-2.5 sm:grid-cols-2">
        <AddressAutocomplete
          label="Moving from"
          placeholder="Pickup address"
          value={from.address}
          onChange={(address) => {
            trackStart();
            updateFromAddress(address);
          }}
          onSelect={(suggestion) => {
            trackStart();
            trackAnalyticsEvent("quote_address_selected", {
              source: "homepage_hero",
              address_type: "from",
              region: suggestion.region || undefined,
            });
            setFrom(buildAddressState(suggestion));
            setErrors((current) => ({ ...current, from: undefined }));
          }}
          error={errors.from}
          labelClassName="sr-only"
          inputClassName={`w-full rounded-xl border bg-slate-50 py-2.5 pr-12 pl-10 text-[0.9rem] font-medium text-slate-900 placeholder:text-slate-400 transition duration-150 focus:bg-white focus:outline-none sm:rounded-2xl sm:pr-24 ${
            errors.from ? "border-red-400 focus:border-red-400 focus:ring-4 focus:ring-red-100" : "border-slate-200 focus:border-brandBlue/70 focus:ring-4 focus:ring-brandBlue/15"
          }`}
        />
        <AddressAutocomplete
          label="Moving to"
          placeholder="Drop-off address"
          value={to.address}
          onChange={(address) => {
            trackStart();
            updateToAddress(address);
          }}
          onSelect={(suggestion) => {
            trackStart();
            trackAnalyticsEvent("quote_address_selected", {
              source: "homepage_hero",
              address_type: "to",
              region: suggestion.region || undefined,
            });
            setTo(buildAddressState(suggestion));
            setErrors((current) => ({ ...current, to: undefined }));
          }}
          error={errors.to}
          labelClassName="sr-only"
          inputClassName={`w-full rounded-xl border bg-slate-50 py-2.5 pr-12 pl-10 text-[0.9rem] font-medium text-slate-900 placeholder:text-slate-400 transition duration-150 focus:bg-white focus:outline-none sm:rounded-2xl sm:pr-24 ${
            errors.to ? "border-red-400 focus:border-red-400 focus:ring-4 focus:ring-red-100" : "border-slate-200 focus:border-brandBlue/70 focus:ring-4 focus:ring-brandBlue/15"
          }`}
        />
      </div>

      <div className="mt-2.5 flex">
        <button
          type="submit"
          className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(110deg,#f7931e,#ffad38)] px-5 py-2.5 text-[0.95rem] font-extrabold text-[#07162b] shadow-[0_16px_30px_-16px_rgba(247,147,30,0.9)] transition duration-200 hover:translate-y-[-1px] hover:shadow-[0_20px_36px_-16px_rgba(247,147,30,0.9)] focus:outline-none focus:ring-4 focus:ring-orange-200 active:translate-y-0 sm:min-h-[48px] sm:w-auto sm:min-w-[210px] sm:rounded-2xl sm:text-base"
        >
          Compare free quotes
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-3 text-[0.7rem] font-semibold text-slate-500 sm:text-xs">
        <span className="inline-flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          Trusted NZ moving companies
        </span>
        <span>100% free</span>
      </div>
    </form>
  );
}
