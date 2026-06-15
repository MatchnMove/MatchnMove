import type { MetadataRoute } from "next";
import { NZ_SERVICE_AREAS } from "@/lib/nz-regions";
import { getPublicMovers } from "@/lib/public-movers";
import { movingResources } from "@/lib/moving-resources";
import { SITE_URL, toRegionSlug } from "@/lib/seo";

const publicRoutes = [
  "",
  "/quote",
  "/movers",
  "/about",
  "/faq",
  "/contact",
  "/resources",
  "/resources/moving-cost-calculator",
  "/mover/pricing",
  "/privacy",
  "/terms"
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const movers = await getPublicMovers();

  const staticPages: MetadataRoute.Sitemap = publicRoutes.map((route) => ({
    url: `${SITE_URL}${route}`,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/quote" ? 0.95 : 0.7,
  }));

  const regionPages: MetadataRoute.Sitemap = NZ_SERVICE_AREAS.map((region) => ({
    url: `${SITE_URL}/moving-quotes/${toRegionSlug(region)}`,
    changeFrequency: "monthly",
    priority: 0.85,
  }));

  const moverPages: MetadataRoute.Sitemap = movers.map((mover) => ({
    url: `${SITE_URL}/movers/${mover.id}`,
    changeFrequency: "weekly",
    priority: 0.75,
  }));

  const resourcePages: MetadataRoute.Sitemap = movingResources.map((resource) => ({
    url: `${SITE_URL}/resources/${resource.slug}`,
    changeFrequency: "monthly",
    priority: resource.slug === "nz-moving-costs-2026" ? 0.9 : 0.8,
  }));

  return [...staticPages, ...resourcePages, ...regionPages, ...moverPages];
}
