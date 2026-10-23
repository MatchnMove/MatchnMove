import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { SavedInventory } from "@/components/saved-inventory";
import { createPageMetadata } from "@/lib/seo";
export const metadata = createPageMetadata({
  title: "Moving Inventory Builder NZ | Plan Your Move",
  description:
    "Build and save a room-by-room moving inventory, with quantities, custom items and notes. Reuse it in your free moving quote request.",
  path: "/moving-inventory",
});
export default function Inventory() {
  return (
    <SiteShell>
      <main className="container-shell max-w-4xl py-12">
        <p className="font-semibold text-teal-700">Planning tools</p>
        <h1 className="mt-3 text-4xl font-bold">
          A clearer picture of what is moving.
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          Work through each room and keep the list together. No account
          required.
        </p>
        <SavedInventory />
        <div className="mt-8 flex flex-wrap gap-5">
          <Link
            className="text-teal-700 underline"
            href="/resources/moving-cost-calculator"
          >
            Estimate moving costs
          </Link>
          <Link
            className="text-teal-700 underline"
            href="/resources/moving-house-checklist"
          >
            Plan your moving checklist
          </Link>
        </div>
      </main>
    </SiteShell>
  );
}
