import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Moving Quotes FAQ",
  description:
    "Answers about free moving quotes, response times, service areas, privacy, payments, and how Match 'n Move works across New Zealand.",
  path: "/faq",
});

export default function FaqLayout({ children }: { children: ReactNode }) {
  return children;
}

