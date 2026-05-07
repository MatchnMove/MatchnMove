"use client";

import { KeyboardEvent, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";

export type AddressSuggestion = {
  label: string;
  street: string;
  suburb: string;
  city: string;
  region: string;
  postcode: string;
  country: string;
};

type NominatimAddress = {
  house_number?: string;
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  region?: string;
  postcode?: string;
  country?: string;
};

type NominatimResult = {
  display_name?: string;
  address?: NominatimAddress;
};

type AddressAutocompleteProps = {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  error?: string;
  helperText?: string;
  inputClassName?: string;
  labelClassName?: string;
  dropdownClassName?: string;
  showIcon?: boolean;
};

export const parseNominatimAddress = (x: NominatimResult): AddressSuggestion => {
  const addr = x.address ?? {};
  const streetParts = [addr.house_number, addr.road].filter((part): part is string => Boolean(part));

  return {
    label: x.display_name ?? "",
    street: streetParts.join(" ").trim(),
    suburb: addr.suburb || addr.neighbourhood || "",
    city: addr.city || addr.town || addr.village || addr.county || "",
    region: addr.state || addr.region || "",
    postcode: addr.postcode || "",
    country: addr.country || "New Zealand"
  };
};

export function addressSuggestionToValue(suggestion: AddressSuggestion) {
  return suggestion.street || suggestion.label;
}

export function AddressAutocomplete({
  label,
  value,
  placeholder,
  onChange,
  onSelect,
  error,
  helperText,
  inputClassName,
  labelClassName,
  dropdownClassName,
  showIcon = true
}: AddressAutocompleteProps) {
  const inputId = useId();
  const listboxId = useId();
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearBlurTimer = () => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
  };

  const fetchSuggestions = async (query: string) => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }

    setLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=nz&limit=5&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: { "Accept-Language": "en-NZ" } });
      const data: unknown = await res.json();
      const parsed = Array.isArray(data) ? data.map(parseNominatimAddress).filter((item) => item.label) : [];
      setSuggestions(parsed);
      setActiveIndex(parsed.length > 0 ? 0 : -1);
    } catch {
      setSuggestions([]);
      setActiveIndex(-1);
    } finally {
      setLoading(false);
    }
  };

  const selectSuggestion = (suggestion: AddressSuggestion) => {
    onSelect(suggestion);
    setSuggestions([]);
    setActiveIndex(-1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    }

    if (event.key === "Escape") {
      setSuggestions([]);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="relative block">
      <label htmlFor={inputId} className={labelClassName ?? "mb-1.5 block text-sm font-semibold text-slate-700"}>{label}</label>
      <span className="relative block">
        {showIcon ? (
          <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brandBlue" />
        ) : null}
        <input
          id={inputId}
          className={
            inputClassName ??
            `w-full rounded-2xl border bg-white py-3.5 pr-4 text-[0.98rem] text-slate-900 placeholder:text-slate-400 shadow-sm transition duration-150 focus:outline-none ${
              showIcon ? "pl-10" : "pl-4"
            } ${error ? "border-red-400 focus:border-red-400 focus:ring-4 focus:ring-red-100" : "border-slate-200 focus:border-brandBlue/70 focus:ring-4 focus:ring-brandBlue/15"}`
          }
          placeholder={placeholder}
          value={value}
          onBlur={() => {
            blurTimerRef.current = setTimeout(() => {
              setSuggestions([]);
              setActiveIndex(-1);
            }, 140);
          }}
          onChange={(event) => {
            const next = event.target.value;
            onChange(next);
            void fetchSuggestions(next);
          }}
          onFocus={() => {
            clearBlurTimer();
            if (value.trim().length >= 3 && suggestions.length === 0) void fetchSuggestions(value);
          }}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={suggestions.length > 0}
          aria-invalid={Boolean(error)}
        />
      </span>

      {loading ? <span className="mt-1.5 block text-xs text-slate-500">Searching addresses...</span> : null}
      {suggestions.length > 0 ? (
        <div
          id={listboxId}
          role="listbox"
          className={
            dropdownClassName ??
            "absolute left-0 right-0 z-50 mt-2 max-h-56 overflow-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_22px_48px_-24px_rgba(15,23,42,0.45)]"
          }
          onMouseDown={(event) => event.preventDefault()}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.label}-${index}`}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              className={`flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left text-sm leading-5 transition ${
                activeIndex === index ? "bg-blue-50 text-slate-950" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
              onClick={() => selectSuggestion(suggestion)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <MapPin className="mt-0.5 h-4 w-4 flex-none text-brandBlue" />
              <span>{suggestion.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      {helperText ? <span className="mt-1.5 block text-xs text-slate-500">{helperText}</span> : null}
      {error ? <span className="mt-1.5 block text-sm text-red-600">{error}</span> : null}
    </div>
  );
}
