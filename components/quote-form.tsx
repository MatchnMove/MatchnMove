"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Archive,
  Armchair,
  BedDouble,
  BedSingle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Info,
  Lamp,
  Package,
  Plus,
  Refrigerator,
  Sofa,
  Table2,
  Tv,
  UtensilsCrossed,
  WashingMachine
} from "lucide-react";
import {
  AddressAutocomplete,
  AddressSuggestion
} from "@/components/address-autocomplete";
import { useLanguage } from "@/components/language-provider";
import { addressSuggestionToValue } from "@/lib/address-search";
import { trackAnalyticsEvent } from "@/lib/analytics";

type Form = {
  name: string;
  email: string;
  phone: string;
  fromPropertyType: string;
  toPropertyType: string;
  bedrooms: string;
  fromAddress: string;
  fromCity: string;
  fromRegion: string;
  fromPostcode: string;
  fromCountry: string;
  toAddress: string;
  toCity: string;
  toRegion: string;
  toPostcode: string;
  toCountry: string;
  moveDate: string;
  dateFlexible: boolean;
  movingWhat: string;
};

type PropertyType = "Apartment" | "House" | "Storage";
type Step3PropertyKnowledge = "yes" | "no" | "";

type FieldKey =
  | keyof Form
  | "fromFloor"
  | "fromHasLift"
  | "fromStorageSize"
  | "toKnownPropertyType"
  | "toBedrooms"
  | "toFloor"
  | "toHasLift"
  | "toStorageSize";

type Errors = Partial<Record<FieldKey, string>>;

type ExtraDetails = {
  fromFloor: string;
  fromHasLift: "yes" | "no" | "";
  fromStorageSize: string;
  toKnownPropertyType: Step3PropertyKnowledge;
  toBedrooms: string;
  toFloor: string;
  toHasLift: "yes" | "no" | "";
  toStorageSize: string;
};

const init: Form = {
  name: "",
  email: "",
  phone: "",
  fromPropertyType: "House",
  toPropertyType: "House",
  bedrooms: "1",
  fromAddress: "",
  fromCity: "",
  fromRegion: "",
  fromPostcode: "",
  fromCountry: "New Zealand",
  toAddress: "",
  toCity: "",
  toRegion: "",
  toPostcode: "",
  toCountry: "New Zealand",
  moveDate: "",
  dateFlexible: false,
  movingWhat: ""
};

const initExtra: ExtraDetails = {
  fromFloor: "",
  fromHasLift: "",
  fromStorageSize: "",
  toKnownPropertyType: "",
  toBedrooms: "",
  toFloor: "",
  toHasLift: "",
  toStorageSize: ""
};

const bedroomOptions = ["1", "2", "3", "4", "5+"] as const;
const storageOptions = [
  "Small (4-9m2)",
  "Medium (10-15m2)",
  "Large (16-21m2)",
  "XL (22m2+)"
] as const;
const MAX_ITEM_QTY = 200;
const MAX_CLEANING_NOTES_LENGTH = 2000;
function createClientRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `quote-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const commonItems = [
  { id: "double-bed", label: "Double Bed", room: "Bedroom", icon: BedDouble },
  { id: "king-bed", label: "King Bed", room: "Bedroom", icon: BedSingle },
  { id: "bedside-table", label: "Bedside Table", room: "Bedroom", icon: Lamp },
  { id: "dresser", label: "Dresser", room: "Bedroom", icon: Archive },
  { id: "sofa", label: "Sofa (3 Seater)", room: "Living Room", icon: Sofa },
  { id: "tv-unit", label: "TV Unit", room: "Living Room", icon: Tv },
  { id: "armchair", label: "Armchair", room: "Living Room", icon: Armchair },
  { id: "fridge", label: "Fridge", room: "Kitchen", icon: Refrigerator },
  { id: "dining-table", label: "Dining Table", room: "Kitchen", icon: Table2 },
  { id: "washing-machine", label: "Washing Machine", room: "Kitchen", icon: WashingMachine },
  { id: "boxes", label: "Boxes", room: "Kitchen", icon: Package }
] as const;

const roomIcons = {
  Bedroom: BedDouble,
  "Living Room": Sofa,
  Kitchen: UtensilsCrossed
} as const;
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
] as const;
const dayLabels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-800 placeholder:text-slate-400 shadow-sm transition-colors duration-150 focus:border-brandBlue/60 focus:ring-4 focus:ring-brandBlue/15 focus:outline-none";
const selectClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-800 shadow-sm transition-colors duration-150 focus:border-brandBlue/60 focus:ring-4 focus:ring-brandBlue/15 focus:outline-none";
const secondaryButtonClass =
  "inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-slate-700 shadow-sm transition-colors duration-150 hover:bg-slate-50 sm:w-auto";
const primaryButtonClass =
  "inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-accentOrange px-6 py-2.5 text-white shadow-[0_8px_20px_-12px_rgba(222,122,58,0.6)] transition-colors duration-150 hover:bg-[#d46f30] sm:w-auto";

const propertyOptions: Array<{ label: PropertyType; image: string }> = [
  { label: "Apartment", image: "/images/property/apartment.webp" },
  { label: "House", image: "/images/property/house.webp" },
  { label: "Storage", image: "/images/property/storage.webp" }
];

export function QuoteForm() {
  const { locale, t, formatNumber } = useLanguage();
  const steps = [
    { number: 1, label: t("quote.step.pickup"), summary: t("quote.step.pickupSummary") },
    { number: 2, label: t("quote.step.destination"), summary: t("quote.step.destinationSummary") },
    { number: 3, label: t("quote.step.contact"), summary: t("quote.step.contactSummary") }
  ] as const;
  const fieldMeta: Record<keyof Form, { label: string; placeholder: string; required?: boolean; type?: string }> = {
    name: { label: t("quote.field.name"), placeholder: t("quote.placeholder.name"), required: true },
    email: { label: t("quote.field.email"), placeholder: "you@example.com", required: true, type: "email" },
    phone: { label: t("quote.field.phone"), placeholder: t("quote.placeholder.phone"), required: true, type: "tel" },
    fromPropertyType: { label: t("quote.field.fromPropertyType"), placeholder: t("quote.property.apartment"), required: true },
    toPropertyType: { label: t("quote.field.toPropertyType"), placeholder: t("quote.property.house"), required: true },
    bedrooms: { label: t("quote.field.bedrooms"), placeholder: "1", required: true },
    fromAddress: { label: t("quote.field.fromAddress"), placeholder: t("quote.placeholder.fromAddress"), required: true },
    fromCity: { label: t("quote.field.fromCity"), placeholder: "Auckland", required: true },
    fromRegion: { label: t("quote.field.fromRegion"), placeholder: t("quote.placeholder.fromRegion"), required: true },
    fromPostcode: { label: t("quote.field.fromPostcode"), placeholder: "1010", required: true },
    fromCountry: { label: t("quote.field.fromCountry"), placeholder: t("quote.placeholder.country"), required: true },
    toAddress: { label: t("quote.field.toAddress"), placeholder: t("quote.placeholder.toAddress"), required: true },
    toCity: { label: t("quote.field.toCity"), placeholder: "Wellington", required: true },
    toRegion: { label: t("quote.field.toRegion"), placeholder: t("quote.placeholder.toRegion"), required: true },
    toPostcode: { label: t("quote.field.toPostcode"), placeholder: "6011", required: true },
    toCountry: { label: t("quote.field.toCountry"), placeholder: t("quote.placeholder.country"), required: true },
    moveDate: { label: t("quote.field.moveDate"), placeholder: "YYYY-MM-DD", type: "date" },
    dateFlexible: { label: t("quote.field.dateFlexible"), placeholder: "" },
    movingWhat: { label: t("quote.field.items"), placeholder: t("quote.placeholder.items") }
  };
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>(init);
  const [extra, setExtra] = useState<ExtraDetails>(initExtra);
  const [errors, setErrors] = useState<Errors>({});
  const [sharingConsent, setSharingConsent] = useState(false);
  const [cleaningSelected, setCleaningSelected] = useState(false);
  const [cleaningNotesExpanded, setCleaningNotesExpanded] = useState(false);
  const [cleaningNotes, setCleaningNotes] = useState("");
  const [cleaningInfoPinned, setCleaningInfoPinned] = useState(false);
  const [cleaningInfoHovered, setCleaningInfoHovered] = useState(false);
  const [cleaningInfoFocused, setCleaningInfoFocused] = useState(false);
  const [cleaningInfoDismissed, setCleaningInfoDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [locating, setLocating] = useState(false);
  const [showItemsPicker, setShowItemsPicker] = useState(false);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [draftItemQty, setDraftItemQty] = useState("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [draftMoveDate, setDraftMoveDate] = useState("");
  const now = new Date();
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const datePickerRef = useRef<HTMLDivElement | null>(null);
  const cleaningInfoRef = useRef<HTMLDivElement | null>(null);
  const cleaningInfoWasOpenRef = useRef(false);
  const cleaningOptionViewedRef = useRef(false);
  const clientRequestIdRef = useRef<string | null>(null);
  const formCardRef = useRef<HTMLDivElement | null>(null);
  const prefillAppliedRef = useRef(false);
  const attributionRef = useRef<Record<string, string>>({});
  const router = useRouter();
  const cleaningInfoId = useId();
  const cleaningNotesId = useId();
  const cleaningInfoOpen =
    !cleaningInfoDismissed && (cleaningInfoPinned || cleaningInfoHovered || cleaningInfoFocused);

  const trackQuoteFormEvent = (eventName: string, params: Record<string, string | number | boolean | undefined> = {}) => {
    trackAnalyticsEvent(eventName, {
      source: "quote_form",
      step,
      language: locale,
      ...params,
    });
  };

  const update = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const updateExtra = <K extends keyof ExtraDetails>(k: K, v: ExtraDetails[K]) => {
    setExtra((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  useEffect(() => {
    if (prefillAppliedRef.current || typeof window === "undefined") return;
    prefillAppliedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const referrerParams = (() => {
      try {
        return new URL(document.referrer).searchParams;
      } catch {
        return new URLSearchParams();
      }
    })();
    const attributionKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"] as const;
    attributionRef.current = {
      landingPage: window.location.href,
      referrer: document.referrer,
      ...Object.fromEntries(
        attributionKeys.flatMap((key) => {
          const value = params.get(key) || referrerParams.get(key);
          return value ? [[key, value]] : [];
        })
      ),
    };
    trackAnalyticsEvent("quote_form_view", {
      source: params.get("utm_source") || referrerParams.get("utm_source") || (document.referrer ? "referral" : "direct"),
      campaign: params.get("utm_campaign") || referrerParams.get("utm_campaign") || undefined,
      has_prefill: params.has("fromAddress") || params.has("toAddress"),
    });

    const keys = [
      "fromAddress",
      "fromCity",
      "fromRegion",
      "fromPostcode",
      "fromCountry",
      "toAddress",
      "toCity",
      "toRegion",
      "toPostcode",
      "toCountry"
    ] as const;

    const prefill = keys.reduce<Partial<Form>>((acc, key) => {
      const value = params.get(key);
      if (value) acc[key] = value;
      return acc;
    }, {});

    if (Object.keys(prefill).length > 0) {
      setForm((current) => ({ ...current, ...prefill }));
      trackAnalyticsEvent("quote_prefill_applied", {
        source: "homepage_hero",
        has_from_region: Boolean(prefill.fromRegion),
        has_to_region: Boolean(prefill.toRegion),
      });
    }
  }, []);

  const applyAddressSuggestion = (kind: "from" | "to", suggestion: AddressSuggestion) => {
    const address = addressSuggestionToValue(suggestion);
    trackQuoteFormEvent("quote_address_selected", {
      address_type: kind,
      region: suggestion.region || undefined,
    });
    setForm((prev) =>
      kind === "from"
        ? {
            ...prev,
            fromAddress: address,
            fromCity: suggestion.city,
            fromRegion: suggestion.region,
            fromPostcode: suggestion.postcode,
            fromCountry: suggestion.country
          }
        : {
            ...prev,
            toAddress: address,
            toCity: suggestion.city,
            toRegion: suggestion.region,
            toPostcode: suggestion.postcode,
            toCountry: suggestion.country
          }
    );
    setErrors((prev) =>
      kind === "from"
        ? {
            ...prev,
            fromAddress: undefined,
            fromCity: undefined,
            fromRegion: undefined,
            fromPostcode: undefined,
            fromCountry: undefined
          }
        : {
            ...prev,
            toAddress: undefined,
            toCity: undefined,
            toRegion: undefined,
            toPostcode: undefined,
            toCountry: undefined
          }
    );
  };

  const shareLocation = () => {
    trackQuoteFormEvent("quote_location_click");
    if (!navigator.geolocation) {
      setSubmitError(t("quote.error.locationUnsupported"));
      return;
    }
    setSubmitError("");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `/api/address-search/reverse?lat=${encodeURIComponent(coords.latitude)}&lon=${encodeURIComponent(coords.longitude)}`
          );
          const data: unknown = await res.json().catch(() => ({}));
          const suggestion =
            typeof data === "object" && data !== null && "suggestion" in data
              ? data.suggestion
              : null;

          if (!res.ok || !suggestion) {
            throw new Error("Location lookup failed.");
          }

          applyAddressSuggestion("from", suggestion as AddressSuggestion);
        } catch {
          setSubmitError(t("quote.error.locationLookup"));
        } finally {
          setLocating(false);
        }
      },
      () => {
        setSubmitError(t("quote.error.locationDenied"));
        setLocating(false);
      }
    );
  };

  const validateField = (k: FieldKey, value: string | boolean) => {
    const v = String(value ?? "").trim();
    if (k in fieldMeta && fieldMeta[k as keyof Form].required && !v) return t("quote.error.required", { field: fieldMeta[k as keyof Form].label });
    if (k === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return t("quote.error.email");
    if (k === "phone" && v && v.replace(/[^\d]/g, "").length < 7) return t("quote.error.phone");
    if (k === "moveDate" && v) {
      const date = new Date(v);
      if (Number.isNaN(date.getTime())) return t("quote.error.moveDate");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) return t("quote.error.moveDatePast");
    }
    if (k === "toKnownPropertyType" && !v) return t("quote.error.yesNo");
    if ((k === "fromFloor" || k === "toFloor") && !v) return t("quote.error.floor");
    if ((k === "fromHasLift" || k === "toHasLift") && !v) return t("quote.error.lift");
    if ((k === "fromStorageSize" || k === "toStorageSize") && !v) return t("quote.error.storageSize");
    if (k === "toBedrooms" && !v) return t("quote.error.bedrooms");
    return "";
  };

  const validateStep = (targetStep: number) => {
    const nextErrors: Errors = {};

    if (targetStep === 3) {
      const keys: Array<keyof Form> = ["name", "email", "phone"];
      for (const key of keys) {
        const err = validateField(key, form[key]);
        if (err) nextErrors[key] = err;
      }
    }

    if (targetStep === 1) {
      const keys: Array<keyof Form> = ["fromAddress"];
      for (const key of keys) {
        const err = validateField(key, form[key]);
        if (err) nextErrors[key] = err;
      }
      if (form.fromPropertyType === "Storage") {
        const err = validateField("fromStorageSize", extra.fromStorageSize);
        if (err) nextErrors.fromStorageSize = err;
      } else {
        if (!form.bedrooms) nextErrors.bedrooms = t("quote.error.bedrooms");
        if (form.fromPropertyType === "Apartment") {
          const floorErr = validateField("fromFloor", extra.fromFloor);
          if (floorErr) nextErrors.fromFloor = floorErr;
          const liftErr = validateField("fromHasLift", extra.fromHasLift);
          if (liftErr) nextErrors.fromHasLift = liftErr;
        }
      }
    }

    if (targetStep === 2) {
      const keys: Array<keyof Form> = ["toAddress", "moveDate"];
      for (const key of keys) {
        const err = validateField(key, form[key]);
        if (err) nextErrors[key] = err;
      }

      const knowErr = validateField("toKnownPropertyType", extra.toKnownPropertyType);
      if (knowErr) nextErrors.toKnownPropertyType = knowErr;

      if (extra.toKnownPropertyType === "yes") {
        if (!form.toPropertyType) nextErrors.toPropertyType = t("quote.error.toPropertyType");
        if (form.toPropertyType === "Storage") {
          const storageErr = validateField("toStorageSize", extra.toStorageSize);
          if (storageErr) nextErrors.toStorageSize = storageErr;
        } else if (form.toPropertyType === "Apartment") {
          const bErr = validateField("toBedrooms", extra.toBedrooms);
          if (bErr) nextErrors.toBedrooms = bErr;
          const floorErr = validateField("toFloor", extra.toFloor);
          if (floorErr) nextErrors.toFloor = floorErr;
          const liftErr = validateField("toHasLift", extra.toHasLift);
          if (liftErr) nextErrors.toHasLift = liftErr;
        } else if (form.toPropertyType === "House") {
          const bErr = validateField("toBedrooms", extra.toBedrooms);
          if (bErr) nextErrors.toBedrooms = bErr;
        }
      }
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = () => {
    const currentStep = step;
    if (!validateStep(currentStep)) {
      trackQuoteFormEvent("quote_step_validation_error", {
        step_number: currentStep,
      });
      return;
    }

    trackQuoteFormEvent("quote_step_complete", {
      step_number: currentStep,
    });
    transitionToStep(Math.min(3, currentStep + 1));
  };

  useEffect(() => {
    if (step !== 3 || cleaningOptionViewedRef.current) return;
    cleaningOptionViewedRef.current = true;
    trackAnalyticsEvent("cleaning_quote_option_viewed", {
      source: "quote_form",
      step: 3,
      language: locale,
      region: form.fromRegion || undefined,
      property_type: form.fromPropertyType,
    });
  }, [form.fromPropertyType, form.fromRegion, locale, step]);

  useEffect(() => {
    if (cleaningInfoOpen && !cleaningInfoWasOpenRef.current) {
      trackAnalyticsEvent("cleaning_quote_info_opened", {
        source: "quote_form",
        step: 3,
        language: locale,
      });
    }

    cleaningInfoWasOpenRef.current = cleaningInfoOpen;
  }, [cleaningInfoOpen, locale]);

  useEffect(() => {
    if (!cleaningInfoOpen) return;

    const closeInfo = () => {
      setCleaningInfoPinned(false);
      setCleaningInfoHovered(false);
      setCleaningInfoDismissed(true);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (cleaningInfoRef.current?.contains(event.target as Node)) return;
      closeInfo();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeInfo();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [cleaningInfoOpen]);

  const submit = async () => {
    trackQuoteFormEvent("quote_submit_attempt", {
      selected_items_count: Object.values(itemQuantities).filter((qty) => qty > 0).length,
      date_flexible: form.dateFlexible,
      cleaning_selected: cleaningSelected,
    });

    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      setSubmitError(t("quote.error.fixFields"));
      trackQuoteFormEvent("quote_submit_validation_error");
      return;
    }
    if (!sharingConsent) {
      setSubmitError(
        cleaningSelected
          ? t("quote.error.consentBoth")
          : t("quote.error.consentMovers"),
      );
      trackQuoteFormEvent("quote_submit_consent_missing");
      return;
    }
    setSubmitError("");
    setLoading(true);
    try {
      const normalizedToPropertyType = extra.toKnownPropertyType === "no" ? "Unknown" : form.toPropertyType;
      const meta = {
        currentProperty: {
          type: form.fromPropertyType,
          bedrooms: form.fromPropertyType === "Storage" ? null : form.bedrooms,
          floor: form.fromPropertyType === "Apartment" ? extra.fromFloor : null,
          hasLift: form.fromPropertyType === "Apartment" ? extra.fromHasLift : null,
          storageSize: form.fromPropertyType === "Storage" ? extra.fromStorageSize : null
        },
        destinationProperty: {
          knownType: extra.toKnownPropertyType,
          type: normalizedToPropertyType,
          bedrooms: normalizedToPropertyType === "Storage" || normalizedToPropertyType === "Unknown" ? null : extra.toBedrooms,
          floor: normalizedToPropertyType === "Apartment" ? extra.toFloor : null,
          hasLift: normalizedToPropertyType === "Apartment" ? extra.toHasLift : null,
          storageSize: normalizedToPropertyType === "Storage" ? extra.toStorageSize : null
        },
        selectedItems: commonItems
          .filter((item) => (itemQuantities[item.id] ?? 0) > 0)
          .map((item) => ({ item: item.label, qty: itemQuantities[item.id] })),
        attribution: attributionRef.current,
      };

      const payload = {
        ...form,
        clientRequestId: clientRequestIdRef.current ?? (clientRequestIdRef.current = createClientRequestId()),
        locale,
        cleaningSelected,
        cleaningNotes: cleaningSelected ? cleaningNotes.trim() || undefined : undefined,
        sharingConsent,
        // Keep locality separate from the free-form street address. Cleaner
        // previews must never treat a manually entered address as a city.
        fromCity: form.fromCity.trim() || "Not provided",
        fromRegion: form.fromRegion.trim() || "Not provided",
        fromPostcode: form.fromPostcode.trim() || "Not provided",
        toCity: form.toCity.trim() || "Not provided",
        toRegion: form.toRegion.trim() || "Not provided",
        toPostcode: form.toPostcode.trim() || "Not provided",
        movingWhat: form.movingWhat.trim(),
        toPropertyType: normalizedToPropertyType,
        moveDate: form.moveDate.trim() ? form.moveDate : null,
        transcriptFields: meta
      };
      const res = await fetch("/api/quote-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = (await res.json().catch(() => null)) as { id?: string } | null;
        const successParams = new URLSearchParams();
        if (data?.id) successParams.set("id", data.id);
        if (cleaningSelected) successParams.set("cleaning", "1");
        const successQuery = successParams.toString();
        trackQuoteFormEvent("quote_submit_success", {
          request_created: Boolean(data?.id),
          from_region: form.fromRegion || undefined,
          to_region: form.toRegion || undefined,
          cleaning_selected: cleaningSelected,
        });
        if (cleaningSelected) {
          trackQuoteFormEvent("cleaning_quote_submitted", {
            region: form.fromRegion || undefined,
            property_type: form.fromPropertyType,
          });
        }
        router.push(`/thank-you${successQuery ? `?${successQuery}` : ""}`);
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      let serverError = "";
      if (contentType.includes("application/json")) {
        const data = await res.json().catch(() => ({}));
        serverError = typeof data?.error === "string" ? data.error : "";
      } else {
        serverError = await res.text().catch(() => "");
      }

      if (res.status === 400) {
        setSubmitError(serverError || t("quote.error.serverValidation"));
      } else if (res.status === 429) {
        setSubmitError(t("quote.error.rateLimit"));
      } else {
        setSubmitError(serverError || t("quote.error.submit"));
      }
      trackQuoteFormEvent("quote_submit_error", {
        status_code: res.status,
      });
    } catch {
      setSubmitError(t("quote.error.network"));
      trackQuoteFormEvent("quote_submit_error", {
        status_code: "network",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateItemQty = (itemId: string, nextQty: number) => {
    const safeQty = Math.min(MAX_ITEM_QTY, Math.max(0, Math.floor(nextQty)));
    trackQuoteFormEvent("quote_items_updated", {
      item_id: itemId,
      quantity: safeQty,
    });
    setItemQuantities((prev) => {
      if (safeQty <= 0) {
        const rest = Object.fromEntries(Object.entries(prev).filter(([key]) => key !== itemId)) as Record<string, number>;
        return rest;
      }
      return { ...prev, [itemId]: safeQty };
    });
  };

  const syncManualItemsWithSelections = (quantities: Record<string, number>) => {
    const selectedLines = commonItems
      .map((item) => ({ item, qty: quantities[item.id] ?? 0 }))
      .filter(({ qty }) => qty > 0)
      .map(({ item, qty }) => `${item.label} x${qty}`);

    const selectedLineMatcher = new RegExp(
      `^(${commonItems.map((item) => item.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s+x\\d+\\s*$`
    );

    const customLines = form.movingWhat
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !selectedLineMatcher.test(line));

    const nextText = [...selectedLines, ...customLines].join("\n");
    update("movingWhat", nextText);
  };

  useEffect(() => {
    syncManualItemsWithSelections(itemQuantities);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemQuantities]);

  const transitionToStep = (nextStep: number) => {
    trackQuoteFormEvent("quote_step_view", {
      step_number: nextStep,
      step_name: steps[nextStep - 1]?.label,
    });
    setStep(nextStep);
    window.requestAnimationFrame(() => {
      const target = formCardRef.current;
      if (!target) return;

      const top = target.getBoundingClientRect().top + window.scrollY - 16;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    });
  };

  const formatDateLabel = (isoDate: string) => {
    if (!isoDate) return t("quote.date.select");
    const d = new Date(`${isoDate}T00:00:00`);
    return d.toLocaleDateString(locale, { month: "long", day: "numeric", year: "numeric" });
  };

  const toIso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const todayIso = toIso(new Date());
  const openDatePicker = () => {
    const base = form.moveDate ? new Date(`${form.moveDate}T00:00:00`) : new Date();
    setCalendarMonth(base.getMonth());
    setCalendarYear(base.getFullYear());
    setDraftMoveDate(form.moveDate || "");
    setIsDatePickerOpen(true);
  };

  const changeCalendarMonth = (delta: number) => {
    const next = new Date(calendarYear, calendarMonth + delta, 1);
    setCalendarMonth(next.getMonth());
    setCalendarYear(next.getFullYear());
  };

  const buildCalendarDays = () => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const cells: Array<{ iso: string; day: number; inMonth: boolean; disabled: boolean }> = [];

    for (let i = 0; i < startWeekday; i++) {
      const d = new Date(calendarYear, calendarMonth, i - startWeekday + 1);
      cells.push({ iso: toIso(d), day: d.getDate(), inMonth: false, disabled: true });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(calendarYear, calendarMonth, day);
      const iso = toIso(d);
      cells.push({ iso, day, inMonth: true, disabled: iso < todayIso });
    }
    while (cells.length % 7 !== 0) {
      const d = new Date(calendarYear, calendarMonth + 1, cells.length - (startWeekday + daysInMonth) + 1);
      cells.push({ iso: toIso(d), day: d.getDate(), inMonth: false, disabled: true });
    }
    return cells;
  };

  const calendarCells = buildCalendarDays();
  const closeDatePicker = () => setIsDatePickerOpen(false);

  useEffect(() => {
    if (!isDatePickerOpen) return;

    const onDocClick = (event: MouseEvent) => {
      if (!datePickerRef.current) return;
      const target = event.target as Node;
      if (!datePickerRef.current.contains(target)) {
        setIsDatePickerOpen(false);
      }
    };

    const onDocKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsDatePickerOpen(false);
    };

    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onDocKeyDown);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  }, [isDatePickerOpen]);

  const startEditingItemQty = (itemId: string) => {
    const currentQty = itemQuantities[itemId] ?? 1;
    setEditingItemId(itemId);
    setDraftItemQty(String(currentQty));
  };

  const commitItemQty = (itemId: string) => {
    if (editingItemId !== itemId) return;
    const parsed = Number.parseInt(draftItemQty, 10);
    if (Number.isNaN(parsed)) {
      setEditingItemId(null);
      return;
    }
    const clamped = Math.min(MAX_ITEM_QTY, Math.max(1, parsed));
    updateItemQty(itemId, clamped);
    setEditingItemId(null);
  };

  const PropertyCards = ({
    value,
    onSelect
  }: {
    value: string;
    onSelect: (next: PropertyType) => void;
  }) => (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {propertyOptions.map(({ label, image }) => {
        const active = value === label;
        const imageClass = label === "Apartment" ? "mx-auto h-16 w-16 object-contain scale-110 sm:h-24 sm:w-24 sm:scale-125" : "mx-auto h-16 w-16 object-contain sm:h-24 sm:w-24";
        return (
          <button
            key={label}
            type="button"
            className={`rounded-xl border p-2.5 text-center transition sm:p-5 ${active ? "border-brandBlue bg-blue-50" : "border-slate-300 bg-white hover:border-slate-400"}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(label)}
          >
            <Image src={image} alt={t(`quote.property.${label.toLowerCase()}`)} width={96} height={96} className={imageClass} />
            <span className="mt-1.5 block text-xs font-medium text-slate-700 sm:mt-2 sm:text-sm">{t(`quote.property.${label.toLowerCase()}`)}</span>
          </button>
        );
      })}
    </div>
  );

  const BedroomsSelector = ({
    value,
    onSelect,
    error
  }: {
    value: string;
    onSelect: (next: string) => void;
    error?: string;
  }) => (
    <div>
      <p className="mb-2 text-sm font-medium">{t("quote.field.bedrooms")}</p>
      <div className="flex flex-wrap gap-2">
        {bedroomOptions.map((b) => (
          <button
            key={b}
            type="button"
            className={`min-h-[42px] min-w-12 rounded-full border px-4 py-2 text-sm ${value === b ? "border-brandBlue bg-blue-50 text-brandBlue" : "border-slate-300 bg-white text-slate-700"}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(b)}
          >
            {b}
          </button>
        ))}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#101b34] to-[#0f2747] py-8 sm:py-12">
      <div className="container-shell relative text-white">
        <div className="mb-5 max-w-3xl sm:mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">{t("quote.eyebrow")}</p>
          <h1 className="mt-2 max-w-2xl text-2xl font-black leading-tight text-white sm:text-4xl">
            {t("quote.title")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            {t("quote.intro")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(cleaningSelected
              ? [t("quote.trust.free"), t("quote.trust.providers"), t("quote.trust.noObligation")]
              : [t("quote.trust.free"), t("quote.trust.movers"), t("quote.trust.noObligation")]
            ).map((note) => (
              <span key={note} className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100">
                {note}
              </span>
            ))}
          </div>
        </div>
        <div ref={formCardRef} className="max-w-3xl rounded-[22px] border border-slate-200/80 bg-white p-4 text-slate-900 shadow-[0_20px_45px_-25px_rgba(2,6,23,0.65)] sm:rounded-2xl sm:p-7">
          <div className="mb-5 sm:mb-7">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <span>{t("quote.progress")}</span>
              <span>{steps[step - 1].label} · Step {step} of 3</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brandBlue to-accentOrange transition-[width] duration-300"
                style={{ width: `${((step - 1) / 2) * 100}%` }}
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {steps.map((item) => (
                <div key={item.number} className="flex items-start gap-2">
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold transition-colors ${
                      step >= item.number ? "bg-brandBlue text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {item.number}
                  </span>
                  <span className={`hidden text-xs sm:block ${step >= item.number ? "text-slate-700" : "text-slate-400"}`}>
                    <span className="block font-semibold">{item.label}</span>
                    <span className="mt-0.5 block font-normal normal-case tracking-normal">{item.summary}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{t("quote.contact.title")}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {t("quote.contact.support")}
                </p>
              </div>
              {(["name", "email", "phone"] as const).map((k) => (
                <label key={k} className="block">
                  <span className="mb-1 block text-sm font-medium">{fieldMeta[k].label}</span>
                  <input
                    className={`${fieldClass} ${errors[k] ? "border-red-500 focus:border-red-400 focus:ring-red-100" : ""}`}
                    placeholder={fieldMeta[k].placeholder}
                    type={fieldMeta[k].type ?? "text"}
                    value={form[k]}
                    onChange={(e) => update(k, e.target.value)}
                  />
                  {errors[k] && <span className="mt-1 block text-sm text-red-600">{errors[k]}</span>}
                </label>
              ))}
              <section
                className={`rounded-2xl border px-4 py-4 transition-colors sm:px-5 ${
                  cleaningSelected ? "border-sky-200 bg-sky-50/80" : "border-slate-200 bg-white"
                }`}
                aria-labelledby={`${cleaningInfoId}-heading`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 id={`${cleaningInfoId}-heading`} className="text-base font-semibold text-slate-950">
                        {t("quote.cleaning.heading")}
                      </h3>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700 shadow-sm">
                        {t("quote.cleaning.optional")}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {t("quote.cleaning.support")}
                    </p>
                  </div>

                  <div
                    ref={cleaningInfoRef}
                    className="relative shrink-0"
                    onMouseEnter={() => {
                      setCleaningInfoDismissed(false);
                      setCleaningInfoHovered(true);
                    }}
                    onMouseLeave={() => setCleaningInfoHovered(false)}
                    onFocusCapture={() => {
                      setCleaningInfoDismissed(false);
                      setCleaningInfoFocused(true);
                    }}
                    onBlurCapture={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                        setCleaningInfoFocused(false);
                      }
                    }}
                  >
                    <button
                      type="button"
                      aria-label={t("quote.cleaning.infoLabel")}
                      aria-expanded={cleaningInfoOpen}
                      aria-controls={cleaningInfoId}
                      aria-describedby={`${cleaningInfoId}-description`}
                      onClick={() => {
                        if (cleaningInfoPinned) {
                          setCleaningInfoPinned(false);
                          setCleaningInfoDismissed(true);
                        } else {
                          setCleaningInfoDismissed(false);
                          setCleaningInfoPinned(true);
                        }
                      }}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-sky-200 bg-white text-sky-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brandBlue/15"
                    >
                      <Info className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span id={`${cleaningInfoId}-description`} className="sr-only">
                      {t("quote.cleaning.info")}
                    </span>
                    {cleaningInfoOpen ? (
                      <div
                        id={cleaningInfoId}
                        role="tooltip"
                        className="absolute right-0 top-full z-50 mt-2 max-h-[min(24rem,calc(100svh-6rem))] w-[min(22rem,calc(100vw-3rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-sm font-normal leading-6 text-slate-100 shadow-[0_20px_45px_-20px_rgba(2,6,23,0.75)]"
                      >
                        {t("quote.cleaning.info")}
                      </div>
                    ) : null}
                  </div>
                </div>

                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <input
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-brandBlue focus:ring-brandBlue"
                    type="checkbox"
                    checked={cleaningSelected}
                    onChange={(event) => {
                      const selected = event.target.checked;
                      setCleaningSelected(selected);
                      if (!selected) setCleaningNotesExpanded(false);
                      if (selected && sharingConsent) setSharingConsent(false);
                      trackQuoteFormEvent(selected ? "cleaning_quote_opt_in" : "cleaning_quote_opt_out", {
                        region: form.fromRegion || undefined,
                        property_type: form.fromPropertyType,
                      });
                      trackQuoteFormEvent("cleaning_quote_selected", {
                        cleaning_selected: selected,
                        region: form.fromRegion || undefined,
                        property_type: form.fromPropertyType,
                      });
                    }}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{t("quote.cleaning.toggle")}</span>
                    <span className="mt-1 block text-sm leading-6 text-slate-500">{t("quote.cleaning.freeSupport")}</span>
                  </span>
                </label>

                {cleaningSelected ? (
                  <div className="mt-3">
                    <button
                      type="button"
                      aria-expanded={cleaningNotesExpanded}
                      aria-controls={cleaningNotesId}
                      onClick={() => {
                        const nextExpanded = !cleaningNotesExpanded;
                        setCleaningNotesExpanded(nextExpanded);
                        if (nextExpanded) {
                          trackQuoteFormEvent("cleaning_notes_expanded", {
                            region: form.fromRegion || undefined,
                            property_type: form.fromPropertyType,
                          });
                        }
                      }}
                      className="inline-flex min-h-10 items-center rounded-xl px-2 text-sm font-semibold text-sky-800 transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brandBlue/15"
                    >
                      {cleaningNotesExpanded ? t("quote.cleaning.hideNotes") : t("quote.cleaning.addNotes")}
                    </button>
                    <div
                      aria-hidden={!cleaningNotesExpanded}
                      className={`grid transition-[grid-template-rows,opacity,margin] duration-200 ${
                        cleaningNotesExpanded ? "mt-2 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <label id={cleaningNotesId} className="block rounded-xl border border-sky-100 bg-white p-3">
                          <span className="mb-2 block text-sm font-medium text-slate-800">{t("quote.cleaning.notesLabel")}</span>
                          <textarea
                            className={fieldClass}
                            rows={4}
                            maxLength={MAX_CLEANING_NOTES_LENGTH}
                            disabled={!cleaningNotesExpanded}
                            value={cleaningNotes}
                            onChange={(event) => setCleaningNotes(event.target.value.slice(0, MAX_CLEANING_NOTES_LENGTH))}
                            placeholder={t("quote.cleaning.notesPlaceholder")}
                          />
                          <span className="mt-1 block text-right text-xs text-slate-500">
                            {formatNumber(cleaningNotes.length)}/{formatNumber(MAX_CLEANING_NOTES_LENGTH)}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <input
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-brandBlue focus:ring-brandBlue"
                  type="checkbox"
                  checked={sharingConsent}
                  onChange={(event) => {
                    setSharingConsent(event.target.checked);
                    if (event.target.checked) setSubmitError("");
                  }}
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">
                    {cleaningSelected
                      ? t("quote.consent.both")
                      : t("quote.consent.movers")}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-slate-500">
                    {t("quote.consent.support")}
                  </span>
                </span>
              </label>
              {submitError && <p className="text-sm text-red-600">{submitError}</p>}
              <div className="flex flex-col gap-3 sm:flex-row">
                <button className={secondaryButtonClass} onClick={() => transitionToStep(2)}>{t("quote.back")}</button>
                <button onClick={submit} disabled={loading} className={`${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-70`}>
                  {loading ? t("quote.submitting") : t("quote.submit")}
                </button>
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="grid gap-4">
              <div>
                <h2 className="text-xl font-semibold">{t("quote.pickup.title")}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {t("quote.pickup.support")}
                </p>
              </div>
              <PropertyCards
                value={form.fromPropertyType}
                onSelect={(next) => {
                  update("fromPropertyType", next);
                  if (next === "Storage") update("bedrooms", "1");
                }}
              />
              {form.fromPropertyType !== "Storage" && (
                <BedroomsSelector value={form.bedrooms} onSelect={(next) => update("bedrooms", next)} error={errors.bedrooms} />
              )}
              {form.fromPropertyType === "Apartment" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">{t("quote.field.floor")}</span>
                    <input
                      className={`${fieldClass} ${errors.fromFloor ? "border-red-500 focus:border-red-400 focus:ring-red-100" : ""}`}
                      placeholder={t("quote.placeholder.floor", { floor: 3 })}
                      value={extra.fromFloor}
                      onChange={(e) => updateExtra("fromFloor", e.target.value)}
                    />
                    {errors.fromFloor && <span className="mt-1 block text-sm text-red-600">{errors.fromFloor}</span>}
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">{t("quote.field.lift")}</span>
                    <select
                      className={`${selectClass} ${errors.fromHasLift ? "border-red-500 focus:border-red-400 focus:ring-red-100" : ""}`}
                      value={extra.fromHasLift}
                      onChange={(e) => updateExtra("fromHasLift", e.target.value as "yes" | "no")}
                    >
                      <option value="">{t("quote.select")}</option>
                      <option value="yes">{t("quote.yes")}</option>
                      <option value="no">{t("quote.no")}</option>
                    </select>
                    {errors.fromHasLift && <span className="mt-1 block text-sm text-red-600">{errors.fromHasLift}</span>}
                  </label>
                </div>
              )}
              {form.fromPropertyType === "Storage" && (
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">{t("quote.field.storageSize")}</span>
                  <select
                    className={`${selectClass} ${errors.fromStorageSize ? "border-red-500 focus:border-red-400 focus:ring-red-100" : ""}`}
                    value={extra.fromStorageSize}
                    onChange={(e) => updateExtra("fromStorageSize", e.target.value)}
                  >
                    <option value="">{t("quote.select")}</option>
                    {storageOptions.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                  {errors.fromStorageSize && <span className="mt-1 block text-sm text-red-600">{errors.fromStorageSize}</span>}
                </label>
              )}
              <AddressAutocomplete
                label={fieldMeta.fromAddress.label}
                placeholder={fieldMeta.fromAddress.placeholder}
                value={form.fromAddress}
                onChange={(value) => update("fromAddress", value)}
                onSelect={(suggestion) => applyAddressSuggestion("from", suggestion)}
                error={errors.fromAddress}
                labelClassName="mb-1 block text-sm font-medium"
              />
              <button
                type="button"
                onClick={shareLocation}
                disabled={locating}
                className="inline-flex min-h-[42px] w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
              >
                {locating ? t("quote.location.detecting") : t("quote.location.use")}
              </button>
              <p className="text-xs leading-5 text-slate-500">
                {t("quote.pickup.addressSupport")}
              </p>
              <button className={primaryButtonClass} onClick={goNext}>{t("quote.continue.destination")}</button>
            </div>
          )}
          {step === 2 && (
            <div className="grid gap-4">
              <div>
                <h2 className="text-xl font-semibold">{t("quote.destination.title")}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {t("quote.destination.support")}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium">{t("quote.destination.knownProperty")}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:flex">
                  <button
                    type="button"
                    className={`min-h-[42px] rounded-xl px-4 py-2 text-sm ${extra.toKnownPropertyType === "yes" ? "bg-brandBlue text-white" : "bg-white text-slate-700 border border-slate-300"}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      updateExtra("toKnownPropertyType", "yes");
                      if (form.toPropertyType === "Unknown") update("toPropertyType", "House");
                    }}
                  >
                    {t("quote.yes")}
                  </button>
                  <button
                    type="button"
                    className={`min-h-[42px] rounded-xl px-4 py-2 text-sm ${extra.toKnownPropertyType === "no" ? "bg-brandBlue text-white" : "bg-white text-slate-700 border border-slate-300"}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      updateExtra("toKnownPropertyType", "no");
                      update("toPropertyType", "Unknown");
                    }}
                  >
                    {t("quote.no")}
                  </button>
                </div>
                {errors.toKnownPropertyType && <p className="mt-1 text-sm text-red-600">{errors.toKnownPropertyType}</p>}
              </div>
              {extra.toKnownPropertyType === "yes" && (
                <>
                  <PropertyCards value={form.toPropertyType} onSelect={(next) => update("toPropertyType", next)} />
                  {errors.toPropertyType && <p className="text-sm text-red-600">{errors.toPropertyType}</p>}
                  {form.toPropertyType === "Apartment" && (
                    <div className="grid gap-4">
                      <BedroomsSelector value={extra.toBedrooms} onSelect={(next) => updateExtra("toBedrooms", next)} error={errors.toBedrooms} />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 block text-sm font-medium">{t("quote.field.floor")}</span>
                          <input
                            className={`${fieldClass} ${errors.toFloor ? "border-red-500 focus:border-red-400 focus:ring-red-100" : ""}`}
                            placeholder={t("quote.placeholder.floor", { floor: 2 })}
                            value={extra.toFloor}
                            onChange={(e) => updateExtra("toFloor", e.target.value)}
                          />
                          {errors.toFloor && <span className="mt-1 block text-sm text-red-600">{errors.toFloor}</span>}
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-sm font-medium">{t("quote.field.lift")}</span>
                          <select
                            className={`${selectClass} ${errors.toHasLift ? "border-red-500 focus:border-red-400 focus:ring-red-100" : ""}`}
                            value={extra.toHasLift}
                            onChange={(e) => updateExtra("toHasLift", e.target.value as "yes" | "no")}
                          >
                            <option value="">{t("quote.select")}</option>
                            <option value="yes">{t("quote.yes")}</option>
                            <option value="no">{t("quote.no")}</option>
                          </select>
                          {errors.toHasLift && <span className="mt-1 block text-sm text-red-600">{errors.toHasLift}</span>}
                        </label>
                      </div>
                    </div>
                  )}
                  {form.toPropertyType === "House" && (
                    <BedroomsSelector value={extra.toBedrooms} onSelect={(next) => updateExtra("toBedrooms", next)} error={errors.toBedrooms} />
                  )}
                  {form.toPropertyType === "Storage" && (
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium">{t("quote.field.storageSize")}</span>
                      <select
                        className={`${selectClass} ${errors.toStorageSize ? "border-red-500 focus:border-red-400 focus:ring-red-100" : ""}`}
                        value={extra.toStorageSize}
                        onChange={(e) => updateExtra("toStorageSize", e.target.value)}
                      >
                        <option value="">{t("quote.select")}</option>
                        {storageOptions.map((size) => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                      {errors.toStorageSize && <span className="mt-1 block text-sm text-red-600">{errors.toStorageSize}</span>}
                    </label>
                  )}
                </>
              )}
              <AddressAutocomplete
                label={fieldMeta.toAddress.label}
                placeholder={fieldMeta.toAddress.placeholder}
                value={form.toAddress}
                onChange={(value) => update("toAddress", value)}
                onSelect={(suggestion) => applyAddressSuggestion("to", suggestion)}
                error={errors.toAddress}
                labelClassName="mb-1 block text-sm font-medium"
              />
              <p className="text-xs leading-5 text-slate-500">
                {t("quote.destination.addressSupport")}
              </p>
              <div className="block">
                <span className="mb-1 block text-sm font-medium">{fieldMeta.moveDate.label}</span>
                <div className="relative" ref={datePickerRef}>
                  <button
                    type="button"
                    onClick={openDatePicker}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2.5 text-left shadow-sm transition-colors duration-150 hover:border-slate-300 ${errors.moveDate ? "border-red-500" : "border-slate-200"}`}
                  >
                    <span className="inline-flex items-center gap-2 text-slate-700">
                      <CalendarDays className="h-4 w-4 text-brandBlue" />
                      <span className={form.moveDate ? "text-slate-800" : "text-slate-500"}>{formatDateLabel(form.moveDate)}</span>
                    </span>
                    <span className="rounded-full bg-brandBlue/10 px-2 py-0.5 text-xs font-semibold text-brandBlue">
                      {form.moveDate ? t("quote.date.change") : t("quote.date.pick")}
                    </span>
                  </button>
                  {isDatePickerOpen && (
                    <div
                      className="absolute left-1/2 z-40 mt-2 w-[min(320px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_20px_40px_-20px_rgba(2,6,23,0.5)] sm:left-0 sm:w-[320px] sm:translate-x-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                          onClick={() => changeCalendarMonth(-1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <div className="flex items-center gap-2">
                          <select
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                            value={calendarMonth}
                            onChange={(e) => setCalendarMonth(Number(e.target.value))}
                          >
                            {monthNames.map((m, idx) => (
                              <option key={m} value={idx}>{m}</option>
                            ))}
                          </select>
                          <select
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                            value={calendarYear}
                            onChange={(e) => setCalendarYear(Number(e.target.value))}
                          >
                            {Array.from({ length: 6 }).map((_, i) => {
                              const y = new Date().getFullYear() + i;
                              return <option key={y} value={y}>{y}</option>;
                            })}
                          </select>
                        </div>
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                          onClick={() => changeCalendarMonth(1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mb-1 grid grid-cols-7 gap-1">
                        {dayLabels.map((d) => (
                          <span key={d} className="text-center text-[11px] font-semibold text-slate-400">{d}</span>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {calendarCells.map((cell) => {
                          const selected = draftMoveDate === cell.iso;
                          return (
                            <button
                              key={cell.iso}
                              type="button"
                              disabled={cell.disabled}
                              onClick={() => setDraftMoveDate(cell.iso)}
                              className={`h-8 rounded-lg text-sm transition ${
                                selected
                                  ? "bg-brandBlue text-white shadow-sm"
                                  : cell.inMonth
                                    ? "text-slate-700 hover:bg-slate-100"
                                    : "text-slate-300"
                              } ${cell.disabled ? "cursor-not-allowed opacity-35" : ""}`}
                            >
                              {cell.day}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <button
                          type="button"
                          className="text-sm text-slate-500 transition hover:text-slate-700"
                          onClick={() => {
                            setDraftMoveDate("");
                            update("moveDate", "");
                            closeDatePicker();
                          }}
                        >
                          {t("quote.clear")}
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
                            onClick={() => {
                              setDraftMoveDate(form.moveDate || "");
                              closeDatePicker();
                            }}
                          >
                            {t("quote.cancel")}
                          </button>
                          <button
                            type="button"
                            className="rounded-lg bg-brandBlue px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brandBlue/90"
                            onClick={() => {
                              closeDatePicker();
                              update("moveDate", draftMoveDate);
                            }}
                          >
                            {t("quote.confirm")}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <span className="mt-1 block text-xs text-slate-500">{t("quote.date.support")}</span>
                {errors.moveDate && <span className="mt-1 block text-sm text-red-600">{errors.moveDate}</span>}
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <span className="text-sm font-medium">{t("quote.field.items")}</span>
                  <button
                    type="button"
                    className="inline-flex min-h-[40px] w-full items-center justify-center gap-1 rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700 sm:w-auto"
                    onClick={() => setShowItemsPicker((v) => !v)}
                  >
                    <Plus className="h-4 w-4" />
                    {t("quote.items.add")}
                  </button>
                </div>
                <textarea
                  className={`min-h-24 w-full rounded-xl border p-3 shadow-sm transition-colors duration-150 focus:ring-4 focus:outline-none ${errors.movingWhat ? "border-red-500 focus:border-red-400 focus:ring-red-100" : "border-slate-200 focus:border-brandBlue/60 focus:ring-brandBlue/15"}`}
                  placeholder={t("quote.placeholder.items")}
                  value={form.movingWhat}
                  onChange={(e) => update("movingWhat", e.target.value)}
                />
                {showItemsPicker && (
                  <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-3 text-xs text-slate-500">{t("quote.items.quantityHelp", { max: MAX_ITEM_QTY })}</p>
                    {(["Bedroom", "Living Room", "Kitchen"] as const).map((room) => {
                      const RoomIcon = roomIcons[room];
                      return (
                        <div key={room} className="mb-4 last:mb-0">
                          <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <RoomIcon className="h-4 w-4 text-brandBlue" />
                            {room}
                          </p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {commonItems
                              .filter((item) => item.room === room)
                              .map((item) => {
                                const qty = itemQuantities[item.id] ?? 0;
                                const ItemIcon = item.icon;
                                return (
                                  <div key={item.id} className="rounded border border-slate-200 bg-white p-2.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex min-w-0 items-center gap-2">
                                        <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-slate-100">
                                          <ItemIcon className="h-4 w-4 text-brandBlue" />
                                        </span>
                                        <span className="truncate text-sm text-slate-700">{item.label}</span>
                                      </div>
                                      {qty > 0 ? (
                                        <div className="inline-flex items-center overflow-hidden rounded border border-brandBlue">
                                          <button
                                            type="button"
                                            className="h-7 w-7 bg-brandBlue text-white"
                                            onClick={() => updateItemQty(item.id, qty - 1)}
                                          >
                                            -
                                          </button>
                                          {editingItemId === item.id ? (
                                            <input
                                              autoFocus
                                              type="text"
                                              inputMode="numeric"
                                              pattern="[0-9]*"
                                              className="h-7 w-12 border-x border-brandBlue px-1 text-center text-xs font-semibold text-brandBlue outline-none"
                                              value={draftItemQty}
                                              onChange={(e) => setDraftItemQty(e.target.value.replace(/\D/g, ""))}
                                              onBlur={() => commitItemQty(item.id)}
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter") commitItemQty(item.id);
                                                if (e.key === "Escape") setEditingItemId(null);
                                              }}
                                            />
                                          ) : (
                                            <button
                                              type="button"
                                              className="px-2 text-xs font-semibold text-brandBlue"
                                              onClick={() => startEditingItemQty(item.id)}
                                            >
                                              x{qty}
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            className="h-7 w-7 bg-brandBlue text-white"
                                            onClick={() => updateItemQty(item.id, qty + 1)}
                                          >
                                            +
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          className="rounded bg-brandBlue px-3 py-1 text-xs text-white"
                                          onClick={() => updateItemQty(item.id, 1)}
                                        >
                                          {t("quote.items.addShort")}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <input className="mt-1 h-4 w-4 rounded border-slate-300 text-brandBlue focus:ring-brandBlue" type="checkbox" checked={form.dateFlexible} onChange={(e) => update("dateFlexible", e.target.checked)} />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{t("quote.flexible.title")}</span>
                  <span className="mt-1 block text-sm leading-6 text-slate-500">{t("quote.flexible.support")}</span>
                </span>
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button className={secondaryButtonClass} onClick={() => transitionToStep(1)}>{t("quote.back")}</button>
                <button className={primaryButtonClass} onClick={goNext}>{t("quote.continue.contact")}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
