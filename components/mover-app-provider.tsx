"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getInstallPlatform, registerMoverAppWorker, type InstallPlatform } from "@/lib/mover-app-client";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type AppContext = {
  installed: boolean; platform: InstallPlatform; canPrompt: boolean; workerError: string;
  install: () => Promise<"accepted" | "dismissed" | "unavailable">; retry: () => void;
};
const Context = createContext<AppContext | null>(null);

export function MoverAppProvider({ children }: { children: ReactNode }) {
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>("desktop");
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [workerError, setWorkerError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const media = window.matchMedia("(display-mode: standalone)");
    const read = () => setInstalled(media.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const before = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const after = () => { setInstalled(true); setPrompt(null); };
    const begin = async () => {
      await Promise.resolve();
      if (!active) return;
      setPlatform(getInstallPlatform(navigator.userAgent, navigator.maxTouchPoints));
      read();
      if (!window.isSecureContext || !("serviceWorker" in navigator)) {
        setWorkerError("Use an up-to-date Safari, Chrome or Edge browser over a secure connection.");
        return;
      }
      try { await registerMoverAppWorker(); if (active) setWorkerError(""); }
      catch { if (active) setWorkerError("App setup could not finish. Check your internet connection, then try again."); }
    };
    window.addEventListener("beforeinstallprompt", before);
    window.addEventListener("appinstalled", after);
    media.addEventListener("change", read);
    void begin();
    return () => { active = false; window.removeEventListener("beforeinstallprompt", before); window.removeEventListener("appinstalled", after); media.removeEventListener("change", read); };
  }, [attempt]);
  const install = useCallback(async () => {
    if (!prompt) return "unavailable" as const;
    try { await prompt.prompt(); return (await prompt.userChoice).outcome; }
    finally { setPrompt(null); }
  }, [prompt]);
  return <Context.Provider value={{ installed, platform, canPrompt: Boolean(prompt), workerError, install, retry: () => setAttempt(value => value + 1) }}>{children}</Context.Provider>;
}
export function useMoverApp() {
  const context = useContext(Context);
  if (!context) throw new Error("Mover app context is unavailable");
  return context;
}
