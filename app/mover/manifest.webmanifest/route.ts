export function GET() {
  return Response.json({
    id: "/mover/dashboard",
    name: "Match 'n Move — Movers",
    short_name: "Match 'n Move",
    description: "Your moving leads, customer details and quote notifications, together in your pocket.",
    start_url: "/mover/dashboard?source=app",
    scope: "/mover/",
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
    shortcuts: [{ name: "My leads", url: "/mover/dashboard?tab=leads", icons: [{ src: "/mover-app/icon-192.png", sizes: "192x192" }] }],
  }, { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } });
}
