import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Contact Match 'n Move",
  description:
    "Contact Match 'n Move for help with moving quote requests, customer support, or moving company partnerships in New Zealand.",
  path: "/contact",
});

export default function ContactLayout({ children }: { children: ReactNode }) {
  return children;
}

