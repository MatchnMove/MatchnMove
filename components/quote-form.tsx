"use client";

import { useEffect, useRef, useState } from "react";
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
  AddressSuggestion,
  addressSuggestionToValue,
  parseNominatimAddress
} from "@/components/address-autocomplete";

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
  fromPropertyType: "Apartment",
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

const fieldMeta: Record<keyof Form, { label: string; placeholder: string; required?: boolean; type?: string }> = {
  name: { label: "Full Name", placeholder: "Enter your full name", required: true },
  email: { label: "Email Address", placeholder: "you@example.com", required: true, type: "email" },
  phone: { label: "Phone Number", placeholder: "e.g. 021 123 4567", required: true, type: "tel" },
  fromPropertyType: { label: "Current Property Type", placeholder: "Apartment", required: true },
  toPropertyType: { label: "Destination Property Type", placeholder: "House", required: true },
  bedrooms: { label: "Number of Bedrooms", placeholder: "1", required: true },
  fromAddress: { label: "Current Address", placeholder: "Start typing your current address", required: true },
  fromCity: { label: "Current City", placeholder: "Auckland", required: true },
  fromRegion: { label: "Current Region", placeholder: "Auckland Region", required: true },
  fromPostcode: { label: "Current Postcode", placeholder: "1010", required: true },
  fromCountry: { label: "Current Country", placeholder: "New Zealand", required: true },
  toAddress: { label: "Destination Address", placeholder: "Start typing your destination address", required: true },
  toCity: { label: "Destination City", placeholder: "Wellington", required: true },
  toRegion: { label: "Destination Region", placeholder: "Wellington Region", required: true },
  toPostcode: { label: "Destination Postcode", placeholder: "6011", required: true },
  toCountry: { label: "Destination Country", placeholder: "New Zealand", required: true },
  moveDate: { label: "Preferred Move Date", placeholder: "YYYY-MM-DD", type: "date" },
  dateFlexible: { label: "Date Flexible", placeholder: "" },
  movingWhat: { label: "Items to Move", placeholder: "Describe what you're moving" }
};

const bedroomOptions = ["1", "2", "3", "4", "5+"] as const;
const storageOptions = [
  "Small (4-9m2)",
  "Medium (10-15m2)",
  "Large (16-21m2)",
  "XL (22m2+)"
] as const;
const MAX_ITEM_QTY = 200;

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
  "rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-slate-700 shadow-sm transition-colors duration-150 hover:bg-slate-50";
const primaryButtonClass =
  "rounded-xl bg-accentOrange px-6 py-2.5 text-white shadow-[0_8px_20px_-12px_rgba(222,122,58,0.6)] transition-colors duration-150 hover:bg-[#d46f30]";

const propertyOptions: Array<{ label: PropertyType; image: string }> = [
  { label: "Apartment", image: "/images/property/apartment.webp" },
  { label: "House", image: "/images/property/house.webp" },
  { label: "Storage", image: "/images/property/storage.webp" }
];

export function QuoteForm() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>(init);
  const [extra, setExtra] = useState<ExtraDetails>(initExtra);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "transcribing" | "complete">("idle");
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
  const formCardRef = useRef<HTMLDivElement | null>(null);
  const prefillAppliedRef = useRef(false);
  const router = useRouter();

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
    }
  }, []);

  const applyAddressSuggestion = (kind: "from" | "to", suggestion: AddressSuggestion) => {
    const address = addressSuggestionToValue(suggestion);
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
    if (!navigator.geolocation) {
      setSubmitError("Location sharing is not supported in this browser.");
      return;
    }
    setSubmitError("");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${coords.latitude}&lon=${coords.longitude}`
          );
          const data = await res.json();
          applyAddressSuggestion("from", parseNominatimAddress(data));
        } catch {
          setSubmitError("Could not convert your location to an address.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setSubmitError("Location permission was denied.");
        setLocating(false);
      }
    );
  };

  const validateField = (k: FieldKey, value: string | boolean) => {
    const v = String(value ?? "").trim();
    if (k in fieldMeta && fieldMeta[k as keyof Form].required && !v) return `${fieldMeta[k as keyof Form].label} is required.`;
    if (k === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter a valid email address.";
    if (k === "phone" && v && v.replace(/[^\d]/g, "").length < 7) return "Enter a valid phone number.";
    if (k === "moveDate" && v) {
      const date = new Date(v);
      if (Number.isNaN(date.getTime())) return "Enter a valid move date.";
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) return "Move date cannot be in the past.";
    }
    if (k === "toKnownPropertyType" && !v) return "Please choose Yes or No.";
    if (k === "fromFloor" && !v) return "Floor is required for apartments.";
    if (k === "fromHasLift" && !v) return "Please select if there is a lift.";
    if (k === "fromStorageSize" && !v) return "Please select your storage unit size.";
    if (k === "toFloor" && !v) return "Floor is required for apartments.";
    if (k === "toHasLift" && !v) return "Please select if there is a lift.";
    if (k === "toStorageSize" && !v) return "Please select your storage unit size.";
    if (k === "toBedrooms" && !v) return "Please select number of bedrooms.";
    return "";
  };

  const validateStep = (targetStep: number) => {
    const nextErrors: Errors = {};

    if (targetStep === 1) {
      const keys: Array<keyof Form> = ["name", "email", "phone"];
      for (const key of keys) {
        const err = validateField(key, form[key]);
        if (err) nextErrors[key] = err;
      }
    }

    if (targetStep === 2) {
      const keys: Array<keyof Form> = ["fromAddress", "fromCity", "fromRegion", "fromPostcode", "fromCountry"];
      for (const key of keys) {
        const err = validateField(key, form[key]);
        if (err) nextErrors[key] = err;
      }
      if (form.fromPropertyType === "Storage") {
        const err = validateField("fromStorageSize", extra.fromStorageSize);
        if (err) nextErrors.fromStorageSize = err;
      } else {
        if (!form.bedrooms) nextErrors.bedrooms = "Please select number of bedrooms.";
        if (form.fromPropertyType === "Apartment") {
          const floorErr = validateField("fromFloor", extra.fromFloor);
          if (floorErr) nextErrors.fromFloor = floorErr;
          const liftErr = validateField("fromHasLift", extra.fromHasLift);
          if (liftErr) nextErrors.fromHasLift = liftErr;
        }
      }
    }

    if (targetStep === 3) {
      const keys: Array<keyof Form> = ["toAddress", "toCity", "toRegion", "toPostcode", "toCountry", "moveDate"];
      for (const key of keys) {
        const err = validateField(key, form[key]);
        if (err) nextErrors[key] = err;
      }

      const knowErr = validateField("toKnownPropertyType", extra.toKnownPropertyType);
      if (knowErr) nextErrors.toKnownPropertyType = knowErr;

      if (extra.toKnownPropertyType === "yes") {
        if (!form.toPropertyType) nextErrors.toPropertyType = "Please select a destination property type.";
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
    if (!validateStep(step)) return;
    transitionToStep(Math.min(3, step + 1));
  };

  const transcribe = async () => {
    setVoiceState("listening");
    setSubmitError("");
    const res = await fetch("/api/transcription/session", { method: "POST" });
    const data = await res.json();
    setVoiceState("transcribing");
    setTimeout(() => {
      setVoiceState("complete");
      if (data.extractedFields) setForm((f) => ({ ...f, ...data.extractedFields }));
    }, 1200);
  };

  const submit = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      setSubmitError("Please fix the highlighted fields.");
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
          .map((item) => ({ item: item.label, qty: itemQuantities[item.id] }))
      };

      const payload = {
        ...form,
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
        router.push("/thank-you");
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
        setSubmitError(serverError || "Some fields failed validation on the server. Please review and try again.");
      } else if (res.status === 429) {
        setSubmitError("Too many attempts. Please wait a moment and try again.");
      } else {
        setSubmitError(serverError || "Submission failed. Please try again.");
      }
    } catch {
      setSubmitError("Network error while submitting the form. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateItemQty = (itemId: string, nextQty: number) => {
    const safeQty = Math.min(MAX_ITEM_QTY, Math.max(0, Math.floor(nextQty)));
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
    setStep(nextStep);
  };

  const formatDateLabel = (isoDate: string) => {
    if (!isoDate) return "Select your move date";
    const d = new Date(`${isoDate}T00:00:00`);
    return d.toLocaleDateString("en-NZ", { month: "long", day: "numeric", year: "numeric" });
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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {propertyOptions.map(({ label, image }) => {
        const active = value === label;
        const imageClass = label === "Apartment" ? "mx-auto h-24 w-24 object-contain scale-125" : "mx-auto h-24 w-24 object-contain";
        return (
          <button
            key={label}
            type="button"
            className={`rounded-lg border p-5 text-center transition ${active ? "border-brandBlue bg-blue-50" : "border-slate-300 bg-white hover:border-slate-400"}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(label)}
          >
            <Image src={image} alt={label} width={96} height={96} className={imageClass} />
            <span className="mt-2 block text-sm font-medium text-slate-700">{label}</span>
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
      <p className="mb-2 text-sm font-medium">Number of bedrooms</p>
      <div className="flex flex-wrap gap-2">
        {bedroomOptions.map((b) => (
          <button
            key={b}
            type="button"
            className={`rounded-full border px-4 py-2 text-sm ${value === b ? "border-brandBlue bg-blue-50 text-brandBlue" : "border-slate-300 bg-white text-slate-700"}`}
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#101b34] to-[#0f2747] py-12">
      <div className="container-shell relative text-white">
        <p className="mb-6 max-w-2xl text-2xl text-slate-100">Fill in your details, or use voice transcription to prefill key fields.</p>
        <div className="mb-5 flex items-center gap-3">
          <button
            onClick={transcribe}
            className="rounded-xl bg-brandBlue px-5 py-2.5 font-medium text-white shadow-[0_8px_18px_-14px_rgba(95,110,232,0.75)] transition-colors duration-150 hover:bg-[#5262df]"
          >
            Transcribe by voice
          </button>
          <span className="rounded-full border border-slate-400/30 bg-slate-900/35 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">{voiceState}</span>
        </div>
        <div ref={formCardRef} className="max-w-3xl rounded-2xl border border-slate-200/80 bg-white p-7 text-slate-900 shadow-[0_20px_45px_-25px_rgba(2,6,23,0.65)]">
          <div className="mb-7">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <span>Progress</span>
              <span>Step {step} of 3</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brandBlue to-accentOrange transition-[width] duration-300"
                style={{ width: `${((step - 1) / 2) * 100}%` }}
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold transition-colors ${
                      step >= n ? "bg-brandBlue text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {n}
                  </span>
                  <span className={`text-xs ${step >= n ? "text-slate-700" : "text-slate-400"}`}>Step {n}</span>
                </div>
              ))}
            </div>
          </div>
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Your Contact Details</h3>
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
              <button className={primaryButtonClass} onClick={goNext}>Next</button>
            </div>
          )}
          {step === 2 && (
            <div className="grid gap-4">
              <h3 className="text-xl font-semibold">What type of property is your moving address?</h3>
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
                    <span className="mb-1 block text-sm font-medium">Which floor is the apartment on?</span>
                    <input
                      className={`${fieldClass} ${errors.fromFloor ? "border-red-500 focus:border-red-400 focus:ring-red-100" : ""}`}
                      placeholder="e.g. Floor 3"
                      value={extra.fromFloor}
                      onChange={(e) => updateExtra("fromFloor", e.target.value)}
                    />
                    {errors.fromFloor && <span className="mt-1 block text-sm text-red-600">{errors.fromFloor}</span>}
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">Is there a lift?</span>
                    <select
                      className={`${selectClass} ${errors.fromHasLift ? "border-red-500 focus:border-red-400 focus:ring-red-100" : ""}`}
                      value={extra.fromHasLift}
                      onChange={(e) => updateExtra("fromHasLift", e.target.value as "yes" | "no")}
                    >
                      <option value="">Please select</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    {errors.fromHasLift && <span className="mt-1 block text-sm text-red-600">{errors.fromHasLift}</span>}
                  </label>
                </div>
              )}
              {form.fromPropertyType === "Storage" && (
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">What size is your storage unit?</span>
                  <select
                    className={`${selectClass} ${errors.fromStorageSize ? "border-red-500 focus:border-red-400 focus:ring-red-100" : ""}`}
                    value={extra.fromStorageSize}
                    onChange={(e) => updateExtra("fromStorageSize", e.target.value)}
                  >
                    <option value="">Please select</option>
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
                className="w-fit rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {locating ? "Detecting location..." : "Use my current location"}
              </button>
              {(["fromCity", "fromRegion", "fromPostcode", "fromCountry"] as const).map((k) => (
                <label key={k} className="block">
                  <span className="mb-1 block text-sm font-medium">{fieldMeta[k].label}</span>
                  <input
                    className={`${fieldClass} ${errors[k] ? "border-red-500 focus:border-red-400 focus:ring-red-100" : ""}`}
                    placeholder={fieldMeta[k].placeholder}
                    value={form[k]}
                    onChange={(e) => update(k, e.target.value)}
                  />
                  {errors[k] && <span className="mt-1 block text-sm text-red-600">{errors[k]}</span>}
                </label>
              ))}
              <div className="flex gap-3">
                <button className={secondaryButtonClass} onClick={() => transitionToStep(1)}>Back</button>
                <button className={primaryButtonClass} onClick={goNext}>Next</button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="grid gap-4">
              <h3 className="text-xl font-semibold">Where are you moving to?</h3>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium">Do you know what type of property you&apos;re moving into?</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className={`rounded px-4 py-2 text-sm ${extra.toKnownPropertyType === "yes" ? "bg-brandBlue text-white" : "bg-white text-slate-700 border border-slate-300"}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      updateExtra("toKnownPropertyType", "yes");
                      if (form.toPropertyType === "Unknown") update("toPropertyType", "House");
                    }}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={`rounded px-4 py-2 text-sm ${extra.toKnownPropertyType === "no" ? "bg-brandBlue text-white" : "bg-white text-slate-700 border border-slate-300"}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      updateExtra("toKnownPropertyType", "no");
                      update("toPropertyType", "Unknown");
                    }}
                  >
                    No
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
                          <span className="mb-1 block text-sm font-medium">Which floor is the apartment on?</span>
                          <input
                            className={`${fieldClass} ${errors.toFloor ? "border-red-500 focus:border-red-400 focus:ring-red-100" : ""}`}
                            placeholder="e.g. Floor 2"
                            value={extra.toFloor}
                            onChange={(e) => updateExtra("toFloor", e.target.value)}
                          />
                          {errors.toFloor && <span className="mt-1 block text-sm text-red-600">{errors.toFloor}</span>}
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-sm font-medium">Is there a lift?</span>
                          <select
                            className={`${selectClass} ${errors.toHasLift ? "border-red-500 focus:border-red-400 focus:ring-red-100" : ""}`}
                            value={extra.toHasLift}
                            onChange={(e) => updateExtra("toHasLift", e.target.value as "yes" | "no")}
                          >
                            <option value="">Please select</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
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
                      <span className="mb-1 block text-sm font-medium">What size is your storage unit?</span>
                      <select
                        className={`${selectClass} ${errors.toStorageSize ? "border-red-500 focus:border-red-400 focus:ring-red-100" : ""}`}
                        value={extra.toStorageSize}
                        onChange={(e) => updateExtra("toStorageSize", e.target.value)}
                      >
                        <option value="">Please select</option>
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
              {(["toCity", "toRegion", "toPostcode", "toCountry"] as const).map((k) => (
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
                      {form.moveDate ? "Change" : "Pick"}
                    </span>
                  </button>
                  {isDatePickerOpen && (
                    <div
                      className="absolute left-0 z-40 mt-2 w-[320px] max-w-[calc(100vw-2.5rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_20px_40px_-20px_rgba(2,6,23,0.5)]"
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
                          Clear
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
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="rounded-lg bg-brandBlue px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brandBlue/90"
                            onClick={() => {
                              closeDatePicker();
                              update("moveDate", draftMoveDate);
                            }}
                          >
                            Confirm
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <span className="mt-1 block text-xs text-slate-500">Select a preferred move date. Leave blank if unsure.</span>
                {errors.moveDate && <span className="mt-1 block text-sm text-red-600">{errors.moveDate}</span>}
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Items to Move</span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
                    onClick={() => setShowItemsPicker((v) => !v)}
                  >
                    <Plus className="h-4 w-4" />
                    Add items
                  </button>
                </div>
                <textarea
                  className={`min-h-24 w-full rounded-xl border p-3 shadow-sm transition-colors duration-150 focus:ring-4 focus:outline-none ${errors.movingWhat ? "border-red-500 focus:border-red-400 focus:ring-red-100" : "border-slate-200 focus:border-brandBlue/60 focus:ring-brandBlue/15"}`}
                  placeholder="Type items manually (one per line) or use the Select Items popup."
                  value={form.movingWhat}
                  onChange={(e) => update("movingWhat", e.target.value)}
                />
                {showItemsPicker && (
                  <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-3 text-xs text-slate-500">Click quantity to edit directly (1-{MAX_ITEM_QTY}).</p>
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
                                          + Add
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
              <label className="flex gap-2">
                <input type="checkbox" checked={form.dateFlexible} onChange={(e) => update("dateFlexible", e.target.checked)} />
                Date flexible
              </label>
              {submitError && <p className="text-sm text-red-600">{submitError}</p>}
              <div className="flex gap-3">
                <button className={secondaryButtonClass} onClick={() => transitionToStep(2)}>Back</button>
                <button onClick={submit} disabled={loading} className={`${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-70`}>
                  {loading ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
