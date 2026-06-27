"use client";

import { FormEvent, useState } from "react";
import { ArrowRight } from "lucide-react";
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
      className="relative z-20 w-full overflow-visible rounded-[18px] border border-white/10 bg-[linear-gradient(145deg,#101b34_0%,#172857_64%,#1f3f86_100%)] p-3 text-left text-white shadow-[0_22px_54px_-38px_rgba(15,23,42,0.85)] sm:rounded-[22px] sm:p-4"
    >
      <h2 className="text-[1.06rem] font-black leading-tight tracking-normal text-white sm:text-[1.36rem]">
        Moving soon? Let&apos;s get you sorted.
      </h2>

      <div className="mt-3 grid gap-2 sm:gap-2.5 sm:grid-cols-2">
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
          labelClassName="mb-1 block text-[0.82rem] font-semibold text-slate-100 sm:text-[0.86rem]"
          inputClassName={`w-full rounded-2xl border bg-white py-2.5 pr-14 pl-10 text-[0.95rem] text-slate-900 placeholder:text-slate-400 shadow-sm transition duration-150 focus:outline-none sm:pr-24 ${
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
          labelClassName="mb-1 block text-[0.82rem] font-semibold text-slate-100 sm:text-[0.86rem]"
          inputClassName={`w-full rounded-2xl border bg-white py-2.5 pr-14 pl-10 text-[0.95rem] text-slate-900 placeholder:text-slate-400 shadow-sm transition duration-150 focus:outline-none sm:pr-24 ${
            errors.to ? "border-red-400 focus:border-red-400 focus:ring-4 focus:ring-red-100" : "border-slate-200 focus:border-brandBlue/70 focus:ring-4 focus:ring-brandBlue/15"
          }`}
        />
      </div>

      <div className="mt-2.5 flex">
        <button
          type="submit"
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#5468ee,#6171f3)] px-5 py-2.5 text-[0.95rem] font-bold text-white shadow-[0_18px_36px_-22px_rgba(79,100,235,0.72)] transition duration-200 hover:translate-y-[-1px] hover:shadow-[0_22px_42px_-22px_rgba(79,100,235,0.82)] focus:outline-none focus:ring-4 focus:ring-brandBlue/20 active:translate-y-0 sm:min-h-[46px] sm:w-auto sm:min-w-[190px] sm:rounded-2xl sm:text-base"
        >
          Get free quotes
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-200/90">
        <span className="rounded-full border border-white/12 bg-white/10 px-2.5 py-1">Free</span>
        <span className="rounded-full border border-white/12 bg-white/10 px-2.5 py-1">No obligation</span>
        <span className="rounded-full border border-white/12 bg-white/10 px-2.5 py-1">NZ movers</span>
      </div>
    </form>
  );
}
