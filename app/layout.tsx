import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.matchnmove.co.nz"),
  title: {
    default: "Match 'n Move",
    template: "%s | Match 'n Move"
  },
  description: "Compare trusted New Zealand moving companies and request furniture removal quotes through Match 'n Move.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Match 'n Move",
    description: "Compare trusted New Zealand moving companies and request furniture removal quotes through Match 'n Move.",
    url: "https://www.matchnmove.co.nz",
    siteName: "Match 'n Move",
    type: "website"
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
