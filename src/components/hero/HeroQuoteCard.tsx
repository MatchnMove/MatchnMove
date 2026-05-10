"use client";

import { FormEvent, useState } from "react";
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
      className="relative z-20 w-full overflow-visible rounded-[24px] border border-white/10 bg-[linear-gradient(145deg,#101b34_0%,#172857_64%,#1f3f86_100%)] p-4 text-left text-white shadow-[0_26px_68px_-40px_rgba(15,23,42,0.85)] sm:p-5"
    >
      <p className="max-w-[36rem] text-[0.92rem] leading-[1.6] text-slate-200 sm:text-[0.98rem]">
        Tell us about your move once, review transparent options, and choose the best mover for your timeline.
      </p>

      <h2 className="mt-3 text-[1.35rem] font-black leading-tight tracking-[-0.03em] text-white sm:text-[1.55rem]">
        Moving soon? Let&apos;s get you sorted.
      </h2>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
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
          labelClassName="mb-1.5 block text-sm font-semibold text-slate-100"
          inputClassName={`w-full rounded-2xl border bg-white py-3 pr-4 pl-10 text-[0.95rem] text-slate-900 placeholder:text-slate-400 shadow-sm transition duration-150 focus:outline-none ${
            errors.from ? "border-red-400 focus:border-red-400 focus:ring-4 focus:ring-red-100" : "border-slate-200 focus:border-brandBlue/70 focus:ring-4 focus:ring-brandBlue/15"
          }`}
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
          labelClassName="mb-1.5 block text-sm font-semibold text-slate-100"
          inputClassName={`w-full rounded-2xl border bg-white py-3 pr-4 pl-10 text-[0.95rem] text-slate-900 placeholder:text-slate-400 shadow-sm transition duration-150 focus:outline-none ${
            errors.to ? "border-red-400 focus:border-red-400 focus:ring-4 focus:ring-red-100" : "border-slate-200 focus:border-brandBlue/70 focus:ring-4 focus:ring-brandBlue/15"
          }`}
        />
      </div>

      <div className="mt-3 flex">
        <button
          type="submit"
          className="inline-flex min-h-[50px] w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#5468ee,#6171f3)] px-5 py-3 text-base font-bold text-white shadow-[0_18px_36px_-22px_rgba(79,100,235,0.72)] transition duration-200 hover:translate-y-[-1px] hover:shadow-[0_22px_42px_-22px_rgba(79,100,235,0.82)] focus:outline-none focus:ring-4 focus:ring-brandBlue/20 active:translate-y-0 sm:w-auto sm:min-w-[220px]"
        >
          Get free quotes
        </button>
      </div>
    </form>
  );
}
