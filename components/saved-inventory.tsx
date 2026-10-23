"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { InventoryEditor } from "@/components/inventory-editor";
import { type InventoryItem } from "@/lib/inventory";
export function SavedInventory() {
  const [value, setValue] = useState<InventoryItem[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/quote-draft", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((d) => {
        if (active) {
          setValue(d.draft?.inventory ?? []);
          setReady(true);
        }
      })
      .catch(() => {
        if (active)
          setMessage(
            "Saved progress is unavailable. Reload before saving to preserve an earlier draft.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  async function save() {
    if (busy || !ready) return false;
    setBusy(true);
    try {
      const current = await fetch("/api/quote-draft", { cache: "no-store" });
      if (!current.ok) throw Error();
      const data = await current.json();
      const res = await fetch("/api/quote-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data.draft, inventory: value }),
      });
      if (!res.ok) throw Error();
      setMessage(
        "Inventory saved securely for 7 days on this browser. It will be available in your quote.",
      );
      return true;
    } catch {
      setMessage("Inventory could not be saved. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-8">
      <InventoryEditor value={value} onChange={setValue} />
      <p className="mt-4 text-sm leading-6 text-slate-600">
        Saving is optional. Inventory notes can contain personal details, so
        this tool uses encrypted server storage and a private browser cookie,
        rather than browser local storage. Clear saved progress in the quote
        form.
      </p>
      <div className="mt-5 flex flex-wrap gap-4">
        <button
          disabled={busy || !ready}
          onClick={save}
          className="rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Saving..." : "Save inventory"}
        </button>
        <Link
          href="/quote"
          onClick={(e) => {
            if (!value.length) return;
            e.preventDefault();
            void save().then((saved) => {
              if (saved) window.location.href = "/quote";
            });
          }}
          className="rounded-xl border border-slate-300 px-5 py-3 font-semibold"
        >
          Use in a quote
        </Link>
      </div>
      <p className="mt-4 text-sm" role="status">
        {message}
      </p>
    </div>
  );
}
