export const LOCALE_COOKIE = "mm_locale";
export const DEFAULT_LOCALE = "en-NZ";

export const SUPPORTED_LOCALES = [
  { code: "en-NZ", nativeName: "English (New Zealand)", englishName: "English" },
  { code: "mi-NZ", nativeName: "Te reo Māori", englishName: "Māori" },
  { code: "sm", nativeName: "Gagana Samoa", englishName: "Samoan" },
  { code: "to", nativeName: "Lea fakatonga", englishName: "Tongan" },
  { code: "zh-CN", nativeName: "简体中文", englishName: "Chinese (Simplified)" },
  { code: "zh-TW", nativeName: "繁體中文", englishName: "Chinese (Traditional)" },
  { code: "hi", nativeName: "हिन्दी", englishName: "Hindi" },
  { code: "pa", nativeName: "ਪੰਜਾਬੀ", englishName: "Punjabi" },
  { code: "gu", nativeName: "ગુજરાતી", englishName: "Gujarati" },
  { code: "ta", nativeName: "தமிழ்", englishName: "Tamil" },
  { code: "ko", nativeName: "한국어", englishName: "Korean" },
  { code: "vi", nativeName: "Tiếng Việt", englishName: "Vietnamese" },
  { code: "fil", nativeName: "Filipino", englishName: "Filipino / Tagalog" },
  { code: "ja", nativeName: "日本語", englishName: "Japanese" },
  { code: "af", nativeName: "Afrikaans", englishName: "Afrikaans" },
] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number]["code"];
export const SUPPORTED_LOCALE_CODES = SUPPORTED_LOCALES.map((locale) => locale.code) as [AppLocale, ...AppLocale[]];

export function isSupportedLocale(value: string | null | undefined): value is AppLocale {
  return SUPPORTED_LOCALES.some((locale) => locale.code === value);
}

export function resolveLocale(value: string | null | undefined): AppLocale {
  return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}
