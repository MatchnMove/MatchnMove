"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { GoogleAnalytics } from "@/app/google-analytics";
import { MicrosoftClarity } from "@/app/microsoft-clarity";
import { isPrivateWorkspacePath } from "@/lib/analytics-privacy";

export function PrivateAnalyticsBoundary({
  children,
  measurementId,
}: {
  children: ReactNode;
  measurementId?: string;
}) {
  const privateRoute = isPrivateWorkspacePath(usePathname());
  const [initialPrivateRoute] = useState(privateRoute);
  const needsNewDocument = privateRoute !== initialPrivateRoute;
  useEffect(() => {
    if (needsNewDocument) window.location.replace(window.location.href);
  }, [needsNewDocument]);

  // A public document may already contain a third-party recorder. Never render
  // private content into it; a fresh document excludes analytics entirely.
  if (needsNewDocument)
    return (
      <p role="status" className="p-6 text-sm text-slate-500">
        Opening your workspace…
      </p>
    );
  if (privateRoute) return children;
  return (
    <>
      <GoogleAnalytics measurementId={measurementId} />
      <MicrosoftClarity />
      {children}
    </>
  );
}
