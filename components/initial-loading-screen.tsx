"use client";

import { useEffect, useState } from "react";
import { MatchLoadingScreen } from "@/components/match-loading-screen";

const HOLD_DURATION_MS = 2200;
const EXIT_DURATION_MS = 560;

export function InitialLoadingScreen() {
  const [isLeaving, setIsLeaving] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const leaveTimer = window.setTimeout(() => {
      setIsLeaving(true);
    }, HOLD_DURATION_MS);

    const removeTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, HOLD_DURATION_MS + EXIT_DURATION_MS);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!isVisible) return null;

  return <MatchLoadingScreen className={`match-loader-screen--entry ${isLeaving ? "match-loader-screen--leaving" : ""}`} />;
}
