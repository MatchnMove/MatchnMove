"use client";

import { Globe2 } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { AppLocale, LANGUAGES_ENABLED, SUPPORTED_LOCALES } from "@/lib/i18n/config";
import { cx } from "@/lib/utils";

export function LanguageSelector({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { locale, setLocale, t } = useLanguage();

  if (!LANGUAGES_ENABLED) return null;

  return (
    <label className={cx("relative inline-flex min-h-10 items-center", className)}>
      <span className="sr-only">{t("language.choose")}</span>
      <Globe2 aria-hidden="true" className="pointer-events-none absolute left-3 h-4 w-4 text-slate-500" />
      <select
        aria-label={t("language.choose")}
        value={locale}
        onChange={(event) => setLocale(event.target.value as AppLocale)}
        className={cx(
          "min-h-10 max-w-full appearance-none rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm font-semibold text-slate-700 outline-none transition focus:border-brandBlue focus:ring-4 focus:ring-indigo-100",
          compact ? "w-12 cursor-pointer text-transparent [&>option]:text-slate-900" : "w-full sm:w-auto",
        )}
      >
        {SUPPORTED_LOCALES.map((item) => (
          <option key={item.code} value={item.code}>
            {item.nativeName} · {item.englishName}
          </option>
        ))}
      </select>
    </label>
  );
}
