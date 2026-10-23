"use client";
import { useEffect, useState } from "react";
export function AnalyticsChoice() {
  const [off, setOff] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) {
        try {
          setOff(localStorage.getItem("mm_analytics_opt_out") === "1");
        } catch {}
      }
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <div className="mt-4">
      <button
        className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold"
        onClick={() => {
          try {
            localStorage.setItem("mm_analytics_opt_out", off ? "0" : "1");
            window.location.reload();
          } catch {
            setMessage(
              "Your browser cannot save this preference. You can enable Do Not Track in your browser.",
            );
          }
        }}
      >
        {off
          ? "Allow optional analytics on this browser"
          : "Turn off optional analytics on this browser"}
      </button>
      <p role="status" className="mt-2 text-sm">
        {message}
      </p>
    </div>
  );
}
