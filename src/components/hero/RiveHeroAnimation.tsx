"use client";

import { useEffect, useMemo, useState } from "react";
import { Alignment, Fit, Layout, useRive } from "@rive-app/react-canvas";

type RiveHeroAnimationProps = {
  mobileInline?: boolean;
};

export function RiveHeroAnimation({ mobileInline = false }: RiveHeroAnimationProps) {
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

  const layout = useMemo(
    () =>
      new Layout({
        fit: Fit.FitWidth,
        alignment: Alignment.BottomCenter,
      }),
    [],
  );

  const { RiveComponent } = useRive({
    src: isMobile ? "/animations/herom.riv" : "/animations/hero.riv",
    autoplay: true,
    layout,
  });

  return (
    <div
      className={
        mobileInline
          ? "relative left-1/2 -mt-6 h-[160px] w-screen min-w-full -translate-x-1/2 overflow-hidden"
          : "relative left-1/2 h-[clamp(170px,22vh,240px)] w-screen min-w-full -translate-x-1/2 overflow-hidden"
      }
      aria-label="Match 'n Move hero animation"
    >
      <RiveComponent
        className={
          isMobile
            ? "absolute bottom-[-14px] left-1/2 z-10 h-[225px] w-[235vw] max-w-none -translate-x-1/2"
            : "relative z-10 h-full w-full"
        }
      />
    </div>
  );
}
