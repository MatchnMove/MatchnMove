"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function LegacyMoverAppRedirect() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === "/" && (window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone)) window.location.replace("/mover/app");
  }, [pathname]);
  return null;
}
