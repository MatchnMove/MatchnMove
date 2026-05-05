/* eslint-disable @next/next/no-img-element */
"use client";

import { ChangeEvent, useState, useTransition } from "react";
import { CheckCircle2, ImagePlus, LoaderCircle, UploadCloud } from "lucide-react";

type MoverLogoUploadProps = {
  initialLogoUrl: string | null;
  onSaved?: (payload: { logoUrl: string; readiness?: unknown }) => void;
};

const MAX_FILE_SIZE = 2 * 1024 * 1024;

export function MoverLogoUpload({ initialLogoUrl, onSaved }: MoverLogoUploadProps) {
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      setMessage(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Please keep the logo under 2MB.");
      setMessage(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) {
        setError("We couldn't read that file. Please try another image.");
        setMessage(null);
        return;
      }

      setError(null);
      setMessage(null);

      startTransition(async () => {
        const response = await fetch("/api/mover/profile/logo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logoUrl: result })
        });

        const payload = (await response.json().catch(() => null)) as { logoUrl?: string; error?: string; readiness?: unknown } | null;

        if (!response.ok) {
          setError(payload?.error ?? "Logo upload failed. Please try again.");
          return;
        }

        setLogoUrl(payload?.logoUrl ?? result);
        setMessage("Logo saved. It can now appear on the About page partner wall.");
        if (payload?.logoUrl) {
          onSaved?.({ logoUrl: payload.logoUrl, readiness: payload.readiness });
        }
      });
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fbff)] p-4 shadow-sm sm:rounded-[28px] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 sm:text-sm">Branding</p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950 sm:mt-2 sm:text-3xl">Company logo</h2>
        </div>
        <div className="rounded-xl bg-sky-50 p-2.5 text-sky-700 sm:rounded-2xl sm:p-3">
          <ImagePlus className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 flex h-32 items-center justify-center rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-4 sm:mt-5 sm:h-40 sm:rounded-[24px]">
        {logoUrl ? (
          <img src={logoUrl} alt="Company logo preview" className="max-h-24 w-auto max-w-full object-contain" />
        ) : (
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">No logo uploaded yet</p>
            <p className="mt-1 text-sm text-slate-500">Add one here and it can automatically populate the About page.</p>
          </div>
        )}
      </div>

      <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#0f172a,#1e3a5f)] px-4 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px] sm:mt-5">
        {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
        {isPending ? "Saving logo..." : "Upload logo"}
        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isPending} />
      </label>

      <p className="mt-3 text-sm leading-6 text-slate-500">PNG, JPG, WEBP, or SVG up to 2MB.</p>

      {message ? (
        <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </p>
      ) : null}

      {error ? <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}
