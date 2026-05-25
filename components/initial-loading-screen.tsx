"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

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

  return (
    <div
      className={`match-loading-screen match-loading-screen--entry ${isLeaving ? "match-loading-screen--leaving" : ""}`}
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <div className="match-loading-grid" aria-hidden="true" />
      <section className="match-loading-panel">
        <div className="match-loading-logo-wrap">
          <Image src="/logo-mark.png" alt="" width={66} height={66} className="match-loading-logo" priority />
          <span className="match-loading-pulse" aria-hidden="true" />
        </div>

        <div className="match-loading-copy">
          <p className="match-loading-kicker">Match &apos;n Move</p>
          <h1>Getting your move ready</h1>
          <p>Finding the clearest path from quote request to moving day.</p>
        </div>

        <div className="match-loading-route" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className="match-loading-bar" aria-hidden="true">
          <span />
        </div>
      </section>
    </div>
  );
}
