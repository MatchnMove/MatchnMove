"use client";

import { useEffect, useState } from "react";
import { MatchLoadingScreen } from "@/components/match-loading-screen";

const ROUTE_LOADER_DELAY_MS = 900;

export function DelayedRouteLoadingScreen() {
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowLoader(true);
    }, ROUTE_LOADER_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  if (!showLoader) return null;

  return <MatchLoadingScreen className="match-loader-screen--route" />;
}
