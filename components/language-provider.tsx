"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { AppLocale, DEFAULT_LOCALE, isSupportedLocale, LANGUAGES_ENABLED, LOCALE_COOKIE, resolveLocale } from "@/lib/i18n/config";
import { getMessage } from "@/lib/i18n/messages";

type TranslateValues = Record<string, string | number>;

type LanguageContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: string, values?: TranslateValues) => string;
  formatCurrency: (cents: number) => string;
  formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function persistBrowserLocale(locale: AppLocale) {
  document.documentElement.lang = locale;
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)}; Max-Age=31536000; Path=/; SameSite=Lax`;
  window.localStorage.setItem(LOCALE_COOKIE, locale);
}

function applyDocumentLocale(locale: AppLocale) {
  document.documentElement.lang = locale;
}

function interpolate(message: string, values?: TranslateValues) {
  if (!values) return message;
  return message.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}

export function LanguageProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
  localeWasExplicit = false,
}: {
  children: ReactNode;
  initialLocale?: AppLocale;
  localeWasExplicit?: boolean;
}) {
  const [locale, setLocaleState] = useState<AppLocale>(() => resolveLocale(initialLocale));
  const accountPreferenceLoadedRef = useRef(false);
  const manuallyChangedLocaleRef = useRef(false);

  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  useEffect(() => {
    if (!LANGUAGES_ENABLED || localeWasExplicit || accountPreferenceLoadedRef.current) return;
    accountPreferenceLoadedRef.current = true;
    let active = true;

    async function loadAccountPreference() {
      try {
        const response = await fetch("/api/account/locale", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as { authenticated?: boolean; locale?: string } | null;
        if (active && !manuallyChangedLocaleRef.current && data?.authenticated && isSupportedLocale(data.locale) && data.locale !== locale) {
          setLocaleState(data.locale);
          persistBrowserLocale(data.locale);
        }
      } catch {
        // Anonymous visitors and temporarily unavailable preferences safely retain English/the cookie locale.
      }
    }

    void loadAccountPreference();
    return () => {
      active = false;
    };
  }, [locale, localeWasExplicit]);

  const setLocale = useCallback((nextLocale: AppLocale) => {
    if (!LANGUAGES_ENABLED) return;
    manuallyChangedLocaleRef.current = true;
    setLocaleState(nextLocale);
    persistBrowserLocale(nextLocale);
    trackAnalyticsEvent("language_changed", { language: nextLocale });
    void fetch("/api/account/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: nextLocale }),
    }).catch(() => undefined);
  }, []);

  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    setLocale,
    t: (key, values) => interpolate(getMessage(locale, key), values),
    formatCurrency: (cents) => new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "NZD",
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(cents / 100),
    formatDate: (input, options) => new Intl.DateTimeFormat(locale, options ?? { dateStyle: "medium" }).format(new Date(input)),
    formatNumber: (input, options) => new Intl.NumberFormat(locale, options).format(input),
  }), [locale, setLocale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
