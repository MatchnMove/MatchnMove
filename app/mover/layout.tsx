import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { MoverAppProvider } from "@/components/mover-app-provider";

export const metadata: Metadata = {
  manifest: "/mover/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Match Movers", statusBarStyle: "default" },
  icons: { apple: [{ url: "/mover-app/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0f172a" };

export default function MoverLayout({ children }: { children: ReactNode }) {
  return <MoverAppProvider>{children}</MoverAppProvider>;
}
