"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import {
  AddressAutocomplete,
  AddressSuggestion,
  addressSuggestionToValue
} from "@/components/address-autocomplete";

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

    const nextErrors = {
      from: from.address.trim() ? undefined : "Enter your pickup address to start.",
      to: to.address.trim() ? undefined : "Enter your drop-off address to continue."
    };

    if (nextErrors.from || nextErrors.to) {
      setErrors(nextErrors);
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

    window.location.href = `/quote?${params.toString()}`;
  };

  return (
    <form
      onSubmit={submit}
      className="relative z-20 w-full overflow-visible rounded-[28px] border border-white/80 bg-white/92 p-4 text-slate-900 shadow-[0_30px_80px_-42px_rgba(15,23,42,0.42)] backdrop-blur-xl sm:p-5 lg:max-w-[440px]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brandBlue">Start your free quote</p>
          <h2 className="mt-2 text-[1.45rem] font-black leading-tight tracking-[-0.03em] text-slate-950 sm:text-[1.7rem]">
            Moving soon? Let&apos;s get you sorted.
          </h2>
        </div>
        <span className="hidden h-11 w-11 flex-none items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 sm:inline-flex">
          <CheckCircle2 className="h-5 w-5" />
        </span>
      </div>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        Enter your pickup and drop-off addresses to start comparing trusted movers.
      </p>

      <div className="mt-5 grid gap-3">
        <AddressAutocomplete
          label="Moving from"
          placeholder="Pickup address"
          value={from.address}
          onChange={updateFromAddress}
          onSelect={(suggestion) => {
            setFrom(buildAddressState(suggestion));
            setErrors((current) => ({ ...current, from: undefined }));
          }}
          error={errors.from}
        />
        <AddressAutocomplete
          label="Moving to"
          placeholder="Drop-off address"
          value={to.address}
          onChange={updateToAddress}
          onSelect={(suggestion) => {
            setTo(buildAddressState(suggestion));
            setErrors((current) => ({ ...current, to: undefined }));
          }}
          error={errors.to}
        />
      </div>

      <button
        type="submit"
        className="mt-5 inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#5468ee,#6171f3)] px-5 py-3 text-base font-bold text-white shadow-[0_18px_36px_-22px_rgba(79,100,235,0.72)] transition duration-200 hover:translate-y-[-1px] hover:shadow-[0_22px_42px_-22px_rgba(79,100,235,0.82)] focus:outline-none focus:ring-4 focus:ring-brandBlue/20 active:translate-y-0"
      >
        Get free quotes
        <ArrowRight className="h-4 w-4" />
      </button>

      <p className="mt-3 text-center text-xs leading-5 text-slate-400">Free to compare. No obligation to book.</p>
    </form>
  );
}
