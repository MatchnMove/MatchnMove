"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Keep the first screen complete when the sticky navigation wraps or resizes. */
export function HeroViewport({ children, className }: { children: ReactNode; className: string }) {
  const layoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const header = document.querySelector("header");
    const layout = layoutRef.current;
    if (!header || !layout) return;

    const updateHeaderHeight = () => {
      layout.style.setProperty("--hero-nav-height", `${Math.ceil(header.getBoundingClientRect().height)}px`);
    };

    updateHeaderHeight();
    const observer = new ResizeObserver(updateHeaderHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return <div ref={layoutRef} className={className}>{children}</div>;
}
