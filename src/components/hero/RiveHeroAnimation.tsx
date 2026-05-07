"use client";

import { useEffect, useState } from "react";
import { Alignment, Fit, Layout, useRive } from "@rive-app/react-canvas";

export function RiveHeroAnimation() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsMobile(mediaQuery.matches);

    sync();
    mediaQuery.addEventListener("change", sync);

    return () => {
      mediaQuery.removeEventListener("change", sync);
    };
  }, []);

  const { RiveComponent } = useRive({
    src: isMobile ? "/animations/herom.riv" : "/animations/hero.riv",
    autoplay: true,
    layout: new Layout({
      fit: Fit.FitWidth,
      alignment: Alignment.BottomCenter,
    }),
  });

  return (
    <div
      className="relative left-1/2 h-[160px] w-screen min-w-full -translate-x-1/2 sm:h-[clamp(190px,25vh,280px)]"
      aria-label="Match N Move hero animation"
    >
      <RiveComponent className="relative z-10 h-full w-full" />
    </div>
  );
}
