import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Match 'n Move",
    short_name: "Match n Move",
    description: "Compare free moving quotes from trusted moving companies across New Zealand.",
    start_url: "/",
    display: "standalone",
    background_color: "#f1f5f9",
    theme_color: "#0f766e",
    icons: [
      {
        src: "/logo-mark.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
