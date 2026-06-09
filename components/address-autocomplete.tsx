"use client";

import { KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { LoaderCircle, MapPin, Search } from "lucide-react";
import type { AddressSuggestion } from "@/lib/address-search";

export type { AddressSuggestion } from "@/lib/address-search";

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
  const [isOpen, setIsOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [provider, setProvider] = useState<"google" | "openstreetmap" | null>(null);
  const [autocompleteAvailable, setAutocompleteAvailable] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeqRef = useRef(0);
  const sessionTokenRef = useRef("");

  const clearBlurTimer = () => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
  };

  const searchAddresses = useCallback(async (mode: "autocomplete" | "manual") => {
    const query = value.trim();
    abortControllerRef.current?.abort();

    if (query.length < 3) {
      setLoading(false);
      setHasSearched(true);
      setSearchError(mode === "manual" ? "Enter at least 3 characters to search." : "");
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const searchSeq = searchSeqRef.current + 1;
    searchSeqRef.current = searchSeq;
    setIsOpen(true);
    setLoading(true);
    setHasSearched(false);
    setSearchError("");

    try {
      if (mode === "autocomplete" && !sessionTokenRef.current) {
        sessionTokenRef.current = crypto.randomUUID();
      }
      const params = new URLSearchParams({ q: query, mode });
      if (mode === "autocomplete") params.set("sessionToken", sessionTokenRef.current);

      const response = await fetch(`/api/address-search?${params.toString()}`, {
        signal: controller.signal
      });
      const data: unknown = await response.json().catch(() => ({}));
      if (controller.signal.aborted || searchSeq !== searchSeqRef.current) return;

      const nextSuggestions =
        typeof data === "object" &&
        data !== null &&
        "suggestions" in data &&
        Array.isArray(data.suggestions)
          ? data.suggestions.filter((item): item is AddressSuggestion => Boolean(item?.label))
          : [];
      const nextProvider =
        typeof data === "object" && data !== null && "provider" in data && data.provider === "google"
          ? "google"
          : mode === "manual"
            ? "openstreetmap"
            : null;

      setSuggestions(nextSuggestions);
      setProvider(nextProvider);
      setActiveIndex(nextSuggestions.length > 0 ? 0 : -1);
      if (mode === "autocomplete") {
        setAutocompleteAvailable(response.ok);
        if (!response.ok) setIsOpen(false);
      }
      setSearchError(response.ok || mode === "autocomplete" ? "" : "Address search is temporarily unavailable. You can still type the address manually.");
    } catch {
      if (controller.signal.aborted || searchSeq !== searchSeqRef.current) return;
      setSuggestions([]);
      setActiveIndex(-1);
      if (mode === "autocomplete") {
        setAutocompleteAvailable(false);
        setSearchError("");
        setIsOpen(false);
      } else {
        setSearchError("Address search is temporarily unavailable. You can still type the address manually.");
      }
    } finally {
      if (!controller.signal.aborted && searchSeq === searchSeqRef.current) {
        setLoading(false);
        setHasSearched(true);
      }
    }
  }, [value]);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    const query = value.trim();
    if (!autocompleteAvailable || query.length < 3) return;

    const timer = setTimeout(() => {
      void searchAddresses("autocomplete");
    }, 350);

    return () => clearTimeout(timer);
  }, [autocompleteAvailable, searchAddresses, value]);

  const selectSuggestion = async (suggestion: AddressSuggestion) => {
    let selectedSuggestion = suggestion;

    if (suggestion.provider === "google" && suggestion.placeId) {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          placeId: suggestion.placeId,
          sessionToken: sessionTokenRef.current,
        });
        const response = await fetch(`/api/address-search/details?${params.toString()}`);
        const data: unknown = await response.json().catch(() => ({}));
        if (
          !response.ok ||
          typeof data !== "object" ||
          data === null ||
          !("suggestion" in data)
        ) {
          throw new Error("Address details unavailable.");
        }
        selectedSuggestion = data.suggestion as AddressSuggestion;
      } catch {
        setSearchError("Could not load that address. Please choose it again or type it manually.");
        setLoading(false);
        return;
      }
    }

    onSelect(selectedSuggestion);
    sessionTokenRef.current = "";
    setIsOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
    setHasSearched(false);
    setSearchError("");
    setLoading(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }

    if (event.key === "Enter" && suggestions.length === 0) {
      event.preventDefault();
      void searchAddresses("manual");
      return;
    }

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
      void selectSuggestion(suggestions[activeIndex]);
    }
  };

  const showDropdown =
    isOpen && Boolean(loading || searchError || suggestions.length > 0 || (hasSearched && value.trim().length >= 3));

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
            `w-full rounded-2xl border bg-white py-3.5 pr-24 text-[0.98rem] text-slate-900 placeholder:text-slate-400 shadow-sm transition duration-150 focus:outline-none ${
              showIcon ? "pl-10" : "pl-4"
            } ${error ? "border-red-400 focus:border-red-400 focus:ring-4 focus:ring-red-100" : "border-slate-200 focus:border-brandBlue/70 focus:ring-4 focus:ring-brandBlue/15"}`
          }
          placeholder={placeholder}
          value={value}
          onBlur={() => {
            blurTimerRef.current = setTimeout(() => {
              setIsOpen(false);
              setSuggestions([]);
              setActiveIndex(-1);
              setHasSearched(false);
            }, 180);
          }}
          onChange={(event) => {
            onChange(event.target.value);
            abortControllerRef.current?.abort();
            setSuggestions([]);
            setSearchError("");
            setHasSearched(false);
            setIsOpen(false);
          }}
          onFocus={() => {
            clearBlurTimer();
            setIsOpen(true);
          }}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showDropdown}
          aria-invalid={Boolean(error)}
        />
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => void searchAddresses("manual")}
          disabled={loading}
          className="absolute right-2 top-1/2 inline-flex min-h-9 -translate-y-1/2 items-center gap-1.5 rounded-xl bg-brandOrange px-3 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-wait disabled:opacity-70"
          aria-label="Search for this address"
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <span className="hidden sm:inline">Search</span>
        </button>
      </span>

      {showDropdown ? (
        <div
          id={listboxId}
          role="listbox"
          className={
            dropdownClassName ??
            "absolute left-0 right-0 z-50 mt-2 max-h-56 overflow-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_22px_48px_-24px_rgba(15,23,42,0.45)]"
          }
          onMouseDown={(event) => event.preventDefault()}
        >
          {loading ? <div className="px-3 py-2.5 text-sm text-slate-500">Searching addresses...</div> : null}
          {searchError ? <div className="px-3 py-2.5 text-sm text-red-600">{searchError}</div> : null}
          {!loading && !searchError && suggestions.length === 0 ? (
            <div className="px-3 py-2.5 text-sm text-slate-500">No address matches found.</div>
          ) : null}
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.label}-${index}`}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              className={`flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left text-sm leading-5 transition ${
                activeIndex === index ? "bg-blue-50 text-slate-950" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
              onClick={() => void selectSuggestion(suggestion)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <MapPin className="mt-0.5 h-4 w-4 flex-none text-brandBlue" />
              <span>{suggestion.label}</span>
            </button>
          ))}
          {!loading && suggestions.length > 0 && provider === "google" ? (
            <div
              translate="no"
              className="px-3 pb-1 pt-2 text-right text-xs font-normal tracking-normal text-[#5e5e5e]"
            >
              Google Maps
            </div>
          ) : null}
          {!loading && suggestions.length > 0 && provider === "openstreetmap" ? (
            <div className="px-3 pb-1 pt-2 text-right text-[11px] text-slate-400">
              ©{" "}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-slate-600"
              >
                OpenStreetMap contributors
              </a>
            </div>
          ) : null}
        </div>
      ) : null}

      {helperText ? <span className="mt-1.5 block text-xs text-slate-500">{helperText}</span> : null}
      {error ? <span className="mt-1.5 block text-sm text-red-600">{error}</span> : null}
    </div>
  );
}
