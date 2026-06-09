import type { Metadata } from "next";
import { Nav } from "@/components/site-shell";
import { QuoteForm } from "@/components/quote-form";

export const metadata: Metadata = {
  title: "Get Free Moving Quotes NZ",
  description: "Tell us about your move once and compare quotes from trusted New Zealand movers.",
  alternates: {
    canonical: "/quote",
  },
};

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
