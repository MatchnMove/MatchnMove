"use client";
import {
  CLEANING_SERVICES,
  type CleaningDetails,
} from "@/lib/cleaning-request";
export const initialCleaning: CleaningDetails = {
  location: "MOVE_OUT",
  services: [],
  destinationConsent: false,
  preferredDate: "",
  timeWindow: "FLEXIBLE",
  propertyEmpty: "UNSURE",
  moverTiming: "UNSURE",
  accessNotes: "",
};
const field =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900";
export function CleaningOptions({
  value,
  onChange,
}: {
  value: CleaningDetails;
  onChange: (v: CleaningDetails) => void;
}) {
  const set = <K extends keyof CleaningDetails>(
    key: K,
    next: CleaningDetails[K],
  ) => onChange({ ...value, [key]: next });
  return (
    <fieldset className="mt-5 space-y-5 border-t border-sky-200 pt-5">
      <legend className="px-1 font-semibold text-slate-950">
        Your optional cleaning enquiry
      </legend>
      <label className="block font-medium">
        Which property needs cleaning?
        <select
          className={field}
          value={value.location}
          onChange={(e) =>
            onChange({
              ...value,
              location: e.target.value as "MOVE_OUT" | "MOVE_IN",
              destinationConsent: false,
              services: (value.services ?? []).filter((s) => s !== "MOVE_IN"),
            })
          }
        >
          <option value="MOVE_OUT">Old place &middot; pickup property</option>
          <option value="MOVE_IN">
            New place &middot; destination property
          </option>
        </select>
      </label>
      <p className="text-sm leading-6 text-slate-600">
        One property per enquiry. Cleaners receive the selected property only,
        without your moving inventory or the other address. For two properties,
        contact support after submitting.
      </p>
      {value.location === "MOVE_IN" && (
        <label className="flex items-start gap-3 rounded-xl border border-sky-200 bg-white p-4 text-sm leading-6">
          <input
            required
            type="checkbox"
            className="mt-1 h-5 w-5 shrink-0"
            checked={Boolean(value.destinationConsent)}
            onChange={(e) => set("destinationConsent", e.target.checked)}
          />
          I authorise sharing my destination property and contact details with
          relevant cleaners for this move-in cleaning enquiry.
        </label>
      )}
      <fieldset>
        <legend className="font-medium">
          Services required (choose any that apply)
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {Object.entries(CLEANING_SERVICES)
            .filter(
              ([key]) => key !== "MOVE_IN" || value.location === "MOVE_IN",
            )
            .map(([key, label]) => (
              <label
                key={key}
                className="flex items-start gap-3 text-sm leading-6"
              >
                <input
                  className="mt-1 h-5 w-5"
                  type="checkbox"
                  checked={
                    value.services?.includes(
                      key as keyof typeof CLEANING_SERVICES,
                    ) ?? false
                  }
                  onChange={(e) =>
                    set(
                      "services",
                      e.target.checked
                        ? [
                            ...(value.services ?? []),
                            key as keyof typeof CLEANING_SERVICES,
                          ]
                        : (value.services ?? []).filter((s) => s !== key),
                    )
                  }
                />
                {label}
              </label>
            ))}
        </div>
      </fieldset>
      {value.services?.includes("CARPET") && (
        <label className="block font-medium">
          Approximate carpeted rooms (optional)
          <input
            type="number"
            min={1}
            max={50}
            className={field}
            value={value.carpetRooms ?? ""}
            onChange={(e) =>
              set(
                "carpetRooms",
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
          />
        </label>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block font-medium">
          Preferred cleaning date (optional)
          <input
            type="date"
            className={field}
            value={value.preferredDate ?? ""}
            onChange={(e) => set("preferredDate", e.target.value)}
          />
        </label>
        <label className="block font-medium">
          Time window
          <select
            className={field}
            value={value.timeWindow}
            onChange={(e) =>
              set("timeWindow", e.target.value as CleaningDetails["timeWindow"])
            }
          >
            {[
              ["FLEXIBLE", "Flexible / not decided"],
              ["MORNING", "Morning"],
              ["AFTERNOON", "Afternoon"],
              ["EVENING", "Evening"],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="block font-medium">
          Will the property be empty?
          <select
            className={field}
            value={value.propertyEmpty}
            onChange={(e) =>
              set(
                "propertyEmpty",
                e.target.value as CleaningDetails["propertyEmpty"],
              )
            }
          >
            <option value="UNSURE">Not sure yet</option>
            <option value="YES">Yes</option>
            <option value="NO">No</option>
          </select>
        </label>
        <label className="block font-medium">
          Cleaning relative to movers
          <select
            className={field}
            value={value.moverTiming}
            onChange={(e) =>
              set(
                "moverTiming",
                e.target.value as CleaningDetails["moverTiming"],
              )
            }
          >
            <option value="UNSURE">Not confirmed</option>
            <option value="BEFORE">Before movers</option>
            <option value="AFTER">After movers</option>
          </select>
        </label>
      </div>
      <label className="block font-medium">
        Access considerations (optional)
        <textarea
          className={field}
          maxLength={1000}
          value={value.accessNotes}
          onChange={(e) => set("accessNotes", e.target.value)}
          placeholder="Parking, stairs, key arrangements. Do not include alarm codes."
        />
      </label>
    </fieldset>
  );
}
