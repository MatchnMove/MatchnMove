"use client";

import { KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeqRef = useRef(0);

  const clearBlurTimer = () => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const query = value.trim();
    abortControllerRef.current?.abort();

    if (query.length < 3) {
      setLoading(false);
      setHasSearched(false);
      setSearchError("");
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const searchSeq = searchSeqRef.current + 1;
    searchSeqRef.current = searchSeq;
    const debounceTimer = setTimeout(async () => {
      setLoading(true);
      setHasSearched(false);
      setSearchError("");

      try {
        const response = await fetch(`/api/address-search?q=${encodeURIComponent(query)}`, {
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
        const providerAvailable =
          typeof data !== "object" ||
          data === null ||
          !("available" in data) ||
          data.available !== false;

        setSuggestions(nextSuggestions);
        setActiveIndex(nextSuggestions.length > 0 ? 0 : -1);
        setSearchError(
          response.ok && providerAvailable
            ? ""
            : "Address search is temporarily unavailable. You can still type the address manually.",
        );
      } catch {
        if (controller.signal.aborted || searchSeq !== searchSeqRef.current) return;
        setSuggestions([]);
        setActiveIndex(-1);
        setSearchError("Address search is temporarily unavailable. You can still type the address manually.");
      } finally {
        if (!controller.signal.aborted && searchSeq === searchSeqRef.current) {
          setLoading(false);
          setHasSearched(true);
        }
      }
    }, 275);

    return () => {
      clearTimeout(debounceTimer);
      controller.abort();
    };
  }, [isOpen, value]);

  const selectSuggestion = (suggestion: AddressSuggestion) => {
    onSelect(suggestion);
    setIsOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
    setHasSearched(false);
    setSearchError("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      setSuggestions([]);
      setActiveIndex(-1);
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
      selectSuggestion(suggestions[activeIndex]);
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
            `w-full rounded-2xl border bg-white py-3.5 pr-4 text-[0.98rem] text-slate-900 placeholder:text-slate-400 shadow-sm transition duration-150 focus:outline-none ${
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
            setIsOpen(true);
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
