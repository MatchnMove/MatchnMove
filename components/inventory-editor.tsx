"use client";
import { useState } from "react";
import {
  INVENTORY_ITEMS,
  INVENTORY_ROOMS,
  type InventoryItem,
} from "@/lib/inventory";
import { trackAnalyticsEvent } from "@/lib/analytics";
export function InventoryEditor({
  value,
  onChange,
  catalogue = true,
}: {
  value: InventoryItem[];
  onChange: (items: InventoryItem[]) => void;
  catalogue?: boolean;
}) {
  const [room, setRoom] = useState<InventoryItem["room"]>("Bedroom");
  const [custom, setCustom] = useState("");
  const [error, setError] = useState("");
  function quantity(
    id: string,
    label: string,
    category: InventoryItem["room"],
    count: number,
  ) {
    trackAnalyticsEvent("inventory_builder_started", { source: "inventory" });
    const n = Math.max(0, Math.min(200, Math.floor(count)));
    const previous = value.find((i) => i.id === id);
    if (!previous && n > 0 && value.length >= 100) {
      setError("You can add up to 100 items.");
      return;
    }
    onChange([
      ...value.filter((i) => i.id !== id),
      ...(n
        ? [
            {
              id,
              label,
              room: category,
              quantity: n,
              notes: previous?.notes ?? "",
            },
          ]
        : []),
    ]);
  }
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 sm:p-6">
      <h2 className="text-xl font-bold">
        {catalogue
          ? "Build your moving inventory"
          : "Additional inventory & custom items"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Choose quantities by room. Add notes for heavy, fragile or unusual
        items. This list helps a mover assess the job; it is not a measured
        volume estimate.
      </p>
      <label className="mt-4 block text-sm font-semibold">
        Room
        <select
          className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 p-3"
          value={room}
          onChange={(e) => setRoom(e.target.value as InventoryItem["room"])}
        >
          {INVENTORY_ROOMS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      {catalogue && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {INVENTORY_ITEMS.filter((i) => i[2] === room).map(
            ([id, label, category]) => (
              <label
                className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm"
                key={id}
              >
                {label}
                <input
                  aria-label={label + " quantity"}
                  type="number"
                  min={0}
                  max={200}
                  className="min-h-11 w-20 rounded-lg border border-slate-300 p-2"
                  value={value.find((i) => i.id === id)?.quantity ?? 0}
                  onChange={(e) =>
                    quantity(id, label, category, Number(e.target.value))
                  }
                />
              </label>
            ),
          )}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <label className="min-w-0 flex-1 text-sm font-semibold">
          Custom item
          <input
            maxLength={100}
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 p-3"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="e.g. large outdoor table"
          />
        </label>
        <button
          type="button"
          className="self-end rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white"
          onClick={() => {
            if (!custom.trim()) return;
            if (value.length >= 100) {
              setError("You can add up to 100 items.");
              return;
            }
            quantity("custom-" + crypto.randomUUID(), custom.trim(), room, 1);
            setCustom("");
            setError("");
          }}
        >
          Add item
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-red-700">
          {error}
        </p>
      )}
      {value.length > 0 && (
        <div className="mt-5 space-y-3">
          <h3 className="font-semibold">
            Your inventory &middot; {value.reduce((n, i) => n + i.quantity, 0)}{" "}
            items
          </h3>
          {value.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200 p-3"
            >
              <div className="flex flex-wrap items-center gap-3">
                <p className="min-w-0 flex-1 text-sm font-semibold">
                  {item.room}: {item.label}
                </p>
                <input
                  aria-label={item.label + " quantity"}
                  className="min-h-11 w-20 rounded-lg border border-slate-300 p-2"
                  type="number"
                  min={1}
                  max={200}
                  value={item.quantity}
                  onChange={(e) =>
                    quantity(
                      item.id,
                      item.label,
                      item.room,
                      Number(e.target.value),
                    )
                  }
                />
                <button
                  type="button"
                  className="min-h-11 px-2 text-sm text-red-700 underline"
                  onClick={() =>
                    onChange(value.filter((i) => i.id !== item.id))
                  }
                >
                  Remove
                </button>
              </div>
              <label className="mt-2 block text-xs text-slate-600">
                Notes (optional)
                <input
                  maxLength={400}
                  className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 p-2 text-sm"
                  value={item.notes}
                  onChange={(e) =>
                    onChange(
                      value.map((i) =>
                        i.id === item.id ? { ...i, notes: e.target.value } : i,
                      ),
                    )
                  }
                />
              </label>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
