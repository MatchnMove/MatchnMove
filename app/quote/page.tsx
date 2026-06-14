import type { Metadata } from "next";
import { Nav } from "@/components/site-shell";
import { QuoteForm } from "@/components/quote-form";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Get Free Moving Quotes NZ",
  description:
    "Request free, no-obligation moving quotes from trusted New Zealand movers. Enter your route and move details once to compare relevant options.",
  path: "/quote",
});

export default function QuotePage() {
  return (
    <>
      <Nav />
      <main>
        <QuoteForm />
      </main>
    </>
  );
}
