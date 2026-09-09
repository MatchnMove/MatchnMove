"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import {
  AddressAutocomplete,
  AddressSuggestion
} from "@/components/address-autocomplete";
import { addressSuggestionToValue } from "@/lib/address-search";
import { trackAnalyticsEvent } from "@/lib/analytics";
import styles from "./HeroQuoteCard.module.css";

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
      className={styles.card}
    >
      <p className={styles.eyebrow}>Let’s get you moving</p>
      <h2 className={styles.title}>Where are you moving?</h2>
      <p className={styles.description}>A fresh start begins with a few details.</p>

      <div className={styles.addressFields}>
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
          labelClassName={styles.label}
          inputClassName={`${styles.input} ${errors.from ? styles.inputError : ""}`}
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
          labelClassName={styles.label}
          inputClassName={`${styles.input} ${errors.to ? styles.inputError : ""}`}
        />
      </div>

      <button type="submit" className={styles.submit}>
        Get my free quotes
        <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
      </button>
      <p className={styles.reassurance}>
        <ShieldCheck aria-hidden="true" size={16} strokeWidth={1.6} />
        Free to compare. No obligation.
      </p>
    </form>
  );
}
