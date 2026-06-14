import type { Metadata } from "next";
import { NZ_SERVICE_AREAS, type NzServiceArea } from "@/lib/nz-regions";

export const SITE_URL = "https://www.matchnmove.co.nz";
export const SITE_NAME = "Match 'n Move";
export const SITE_PHONE = "+64 21 958 000";
export const SITE_DESCRIPTION =
  "Compare free moving quotes from trusted New Zealand moving companies. Submit your move once and find movers for local, intercity, and long-distance relocations.";

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function createPageMetadata({
  title,
  description,
  path,
  image = "/opengraph-image",
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  noIndex?: boolean;
}): Metadata {
  const url = absoluteUrl(path);

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : {
          index: true,
          follow: true,
        },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "en_NZ",
      type: "website",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} - free moving quotes across New Zealand`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export function toRegionSlug(region: NzServiceArea) {
  return region
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getRegionFromSlug(slug: string) {
  return NZ_SERVICE_AREAS.find((region) => toRegionSlug(region) === slug) ?? null;
}

