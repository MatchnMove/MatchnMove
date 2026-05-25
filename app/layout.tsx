import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";
import { InitialLoadingScreen } from "@/components/initial-loading-screen";

const siteUrl = "https://www.matchnmove.co.nz";
const siteName = "Match 'n Move";
const siteDescription =
  "Get free moving quotes from trusted New Zealand furniture removal companies. Tell Match 'n Move once, compare movers, and choose the best fit.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: `${siteName} | Free Moving Quotes NZ`,
    template: `%s | ${siteName}`
  },
  description: siteDescription,
  keywords: [
    "Match 'n Move",
    "moving quotes NZ",
    "furniture removal quotes",
    "New Zealand movers",
    "moving companies New Zealand"
  ],
  alternates: {
    canonical: "/"
  },
  icons: {
    icon: [{ url: "/logo-mark.png", type: "image/png" }],
    shortcut: [{ url: "/logo-mark.png", type: "image/png" }]
  },
  openGraph: {
    title: `${siteName} | Free Moving Quotes NZ`,
    description: siteDescription,
    url: siteUrl,
    siteName,
    locale: "en_NZ",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: `${siteName} | Free Moving Quotes NZ`,
    description: siteDescription
  }
};

export const viewport: Viewport = {
  themeColor: "#0f766e"
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: siteName,
      url: siteUrl,
      logo: `${siteUrl}/logo.webp`
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: siteName,
      url: siteUrl,
      description: siteDescription,
      publisher: {
        "@id": `${siteUrl}/#organization`
      }
    }
  ]
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <InitialLoadingScreen />
        {children}
      </body>
    </html>
  );
}
