import type { MetadataRoute } from "next";

// Keep the mover app identity stable for existing installations.
export function moverAppManifest(): MetadataRoute.Manifest {
  return {
    id: "/mover/dashboard",
    name: "Match 'n Move — Business",
    short_name: "Match n Move",
    description: "The workspace for moving and cleaning companies, with separate accounts and leads.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#f1f5f9",
    theme_color: "#0f172a",
    lang: "en-NZ",
    categories: ["business", "productivity"],
    icons: [
      { src: "/mover-app/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/mover-app/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/mover-app/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "My leads", url: "/app", icons: [{ src: "/mover-app/icon-192.png", sizes: "192x192" }] }],
  };
}
