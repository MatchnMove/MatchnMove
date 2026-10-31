"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { Building2 } from "lucide-react";

export function CompanyLogo({ src, companyName, loading = "lazy" }: {
  src: string | null;
  companyName: string;
  loading?: "lazy" | "eager";
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return src && failedSrc !== src ? (
    <img src={src} alt={`${companyName} logo`} loading={loading}
      className="max-h-full max-w-full object-contain"
      onError={() => setFailedSrc(src)} />
  ) : (
    <Building2 className="text-slate-500" role="img" aria-label={`${companyName} logo unavailable`} />
  );
}
