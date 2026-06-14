import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";
import { SITE_DESCRIPTION, SITE_NAME, SITE_PHONE, SITE_URL, absoluteUrl } from "@/lib/seo";
import { SITE_EMAILS } from "@/lib/site-emails";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: `Free Moving Quotes NZ | ${SITE_NAME}`,
    template: `%s | ${SITE_NAME}`
  },
  description: SITE_DESCRIPTION,
  category: "Moving and relocation services",
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [{ url: "/logo-mark.png", type: "image/png" }],
    shortcut: [{ url: "/logo-mark.png", type: "image/png" }],
    apple: [{ url: "/logo-mark.png", type: "image/png" }],
  },
  openGraph: {
    title: `Free Moving Quotes NZ | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "en_NZ",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} - free moving quotes across New Zealand`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Free Moving Quotes NZ | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? {
        google: process.env.GOOGLE_SITE_VERIFICATION,
      }
    : undefined,
};

export const viewport: Viewport = {
  themeColor: "#0f766e"
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/logo.webp"),
      },
      email: SITE_EMAILS.contact,
      telephone: SITE_PHONE,
      areaServed: {
        "@type": "Country",
        name: "New Zealand",
      },
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: SITE_EMAILS.support,
          telephone: SITE_PHONE,
          areaServed: "NZ",
          availableLanguage: "English",
        },
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      alternateName: "Match n Move",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: "en-NZ",
      publisher: {
        "@id": `${SITE_URL}/#organization`,
      },
    },
    {
      "@type": "Service",
      "@id": `${SITE_URL}/#moving-quote-service`,
      name: "Free moving quote comparison",
      description: SITE_DESCRIPTION,
      serviceType: "Moving quote comparison",
      provider: {
        "@id": `${SITE_URL}/#organization`,
      },
      areaServed: {
        "@type": "Country",
        name: "New Zealand",
      },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "NZD",
        description: "Free for customers to request and compare moving quotes.",
      },
    },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
      </body>
    </html>
  );
}
