import type { MetadataRoute } from "next";

const baseUrl = "https://www.matchnmove.co.nz";

const publicRoutes = [
  "",
  "/quote",
  "/movers",
  "/about",
  "/faq",
  "/contact",
  "/mover/pricing",
  "/privacy",
  "/terms"
];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7
  }));
}
