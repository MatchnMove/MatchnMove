"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState, useTransition, type HTMLAttributes } from "react";
import { CheckCircle2, FileText, LoaderCircle, Pencil, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { MoverLogoUpload } from "@/components/mover-logo-upload";
import { NzRegionSelector } from "@/components/nz-region-selector";
import { formatServiceAreaLabel, sanitiseNzServiceAreas } from "@/lib/nz-regions";
import { cx } from "@/lib/utils";

type ReadinessCheck = {
  key: string;
  complete: boolean;
  label: string;
};

type ProfileDocument = {
  id: string;
  type: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
  viewUrl: string;
  createdAt: string;
};

export type MoverProfileState = {
  companyName: string;
  businessDescription: string;
  contactPerson: string;
  phone: string;
  nzbn: string;
  yearsOperating: number | null;
  serviceAreas: string[];
  email: string;
  emailVerified: boolean;
  logoUrl: string | null;
  documents: ProfileDocument[];
  readiness: {
    completion: number;
    checks: ReadinessCheck[];
  };
};

type Props = {
  profile: MoverProfileState;
  onProfileChange: (profile: MoverProfileState) => void;
  focusSection?: "profile" | "documents" | null;
  onFocusHandled?: () => void;
};

const phonePattern = /^[+\d][\d\s()-]{6,24}$/;
const nzbnPattern = /^\d{13}$/;
const MAX_DOCUMENT_SIZE = 4 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const BUSINESS_DESCRIPTION_LIMIT = 800;
const DOCUMENT_TYPE_DETAILS = {
  INSURANCE: {
    title: "Insurance",
    description: "Upload current proof that your moving business is insured. A certificate of currency or policy schedule is best.",
    examples: ["Public liability insurance", "Goods in transit or carrier's liability cover", "Commercial vehicle or fleet insurance"],
  },
  NZBN_PROOF: {
    title: "NZBN proof",
    description: "Upload a document that clearly shows your business name and 13-digit NZBN so your company details can be verified.",
    examples: ["NZBN register extract", "IRD or Companies Office document showing the NZBN", "Official business record with your NZBN visible"],
  },
  LICENCE: {
    title: "Licence",
    description: "Upload any licence or transport authorisation relevant to the vehicles or services your moving business operates.",
    examples: ["Goods service licence", "Transport service licence", "Other operator or business licence relevant to your work"],
  },
  OTHER: {
    title: "Other",
    description: "Upload any other supporting business document that helps verify or strengthen your mover profile.",
    examples: ["Health and safety certification", "Industry membership", "Additional compliance or verification document"],
  },
} as const;

function formatFileSize(fileSize: number | null) {
  if (!fileSize) return "Unknown size";
  if (fileSize >= 1024 * 1024) return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(fileSize / 1024)} KB`;
}

function inferReadiness(profile: MoverProfileState) {
  const checks = [
    { key: "email", complete: profile.emailVerified, label: profile.emailVerified ? "Verified" : "Needs action" },
    { key: "contact", complete: Boolean(profile.contactPerson && profile.phone), label: profile.contactPerson && profile.phone ? "Ready" : "Missing details" },
    { key: "business", complete: Boolean(profile.nzbn && profile.yearsOperating !== null), label: profile.nzbn && profile.yearsOperating !== null ? "Ready" : "Needs action" },
    { key: "serviceAreas", complete: profile.serviceAreas.length > 0, label: profile.serviceAreas.length ? `${profile.serviceAreas.length} selected` : "Add regions" },
    { key: "logo", complete: Boolean(profile.logoUrl), label: profile.logoUrl ? "Uploaded" : "Missing" },
    { key: "docs", complete: profile.documents.length > 0, label: profile.documents.length ? `${profile.documents.length} on file` : "0 on file" },
  ];

  return {
    completion: Math.round((checks.filter((check) => check.complete).length / checks.length) * 100),
    checks,
  };
}

function withReadiness(profile: MoverProfileState, readiness?: MoverProfileState["readiness"]) {
  return { ...profile, readiness: readiness ?? inferReadiness(profile) };
}

export function MoverProfileSettings({ profile, onProfileChange, focusSection, onFocusHandled }: Props) {
  const editableServiceAreas = sanitiseNzServiceAreas(profile.serviceAreas);
  const profileSectionRef = useRef<HTMLElement | null>(null);
  const documentsSectionRef = useRef<HTMLElement | null>(null);
  const [form, setForm] = useState({
    businessDescription: profile.businessDescription,
    contactPerson: profile.contactPerson,
    phone: profile.phone,
    nzbn: profile.nzbn,
    yearsOperating: profile.yearsOperating === null ? "" : String(profile.yearsOperating),
    serviceAreas: editableServiceAreas,
  });
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<"INSURANCE" | "NZBN_PROOF" | "LICENCE" | "OTHER">("INSURANCE");
  const [categoryDocuments, setCategoryDocuments] = useState<ProfileDocument[]>(profile.documents.filter((document) => document.type === "INSURANCE"));
  const [isLoadingDocuments, startLoadingDocuments] = useTransition();
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [documentSuccess, setDocumentSuccess] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isUploading, startUploading] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const selectedDocumentType = DOCUMENT_TYPE_DETAILS[documentType];

  const readinessItems = useMemo(() => {
    const readinessMap = new Map(profile.readiness.checks.map((check) => [check.key, check]));
    return [
      { title: "Email", key: "email" },
      { title: "Contact", key: "contact" },
      { title: "Business", key: "business" },
      { title: "Areas", key: "serviceAreas" },
      { title: "Logo", key: "logo" },
      { title: "Docs", key: "docs" },
    ].map((item) => ({ ...item, check: readinessMap.get(item.key) }));
  }, [profile.readiness.checks]);

  useEffect(() => {
    let active = true;
    setDocumentError(null);

    startLoadingDocuments(async () => {
      const response = await fetch(`/api/mover/profile/documents?type=${documentType}`, { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as { error?: string; documents?: ProfileDocument[] } | null;

      if (!active) return;

      if (!response.ok) {
        setCategoryDocuments([]);
        setDocumentError(data?.error ?? "Could not load documents for that category.");
        return;
      }

      setCategoryDocuments(data?.documents ?? []);
    });

    return () => {
      active = false;
    };
  }, [documentType]);

  useEffect(() => {
    if (!focusSection) return;

    const target = focusSection === "documents" ? documentsSectionRef.current : profileSectionRef.current;
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      target.focus({ preventScroll: true });
      onFocusHandled?.();
    }, 180);
  }, [focusSection, onFocusHandled]);

  function validateForm() {
    if (form.contactPerson.trim().length < 2) return "Enter a contact name.";
    if (!phonePattern.test(form.phone.trim())) return "Enter a valid phone number.";
    if (form.nzbn.trim() && !nzbnPattern.test(form.nzbn.trim())) return "NZBN must be 13 digits.";

    if (form.yearsOperating.trim()) {
      const years = Number(form.yearsOperating.trim());
      if (!Number.isInteger(years) || years < 0 || years > 200) return "Years operating must be between 0 and 200.";
    }

    if (!form.serviceAreas.length) return "Choose at least one coverage region.";
    if (form.businessDescription.trim().length > BUSINESS_DESCRIPTION_LIMIT) return `Business description must be ${BUSINESS_DESCRIPTION_LIMIT} characters or less.`;

    return null;
  }

  function resetForm() {
    setForm({
      businessDescription: profile.businessDescription,
      contactPerson: profile.contactPerson,
      phone: profile.phone,
      nzbn: profile.nzbn,
      yearsOperating: profile.yearsOperating === null ? "" : String(profile.yearsOperating),
      serviceAreas: editableServiceAreas,
    });
  }

  function saveProfile() {
    const clientError = validateForm();
    if (clientError) {
      setError(clientError);
      setSuccess(null);
      return;
    }

    setError(null);
    setSuccess(null);

    const payload = {
      businessDescription: form.businessDescription.trim(),
      contactPerson: form.contactPerson.trim(),
      phone: form.phone.trim(),
      nzbn: form.nzbn.trim(),
      yearsOperating: form.yearsOperating.trim(),
      serviceAreas: form.serviceAreas,
    };

    startSaving(async () => {
      const response = await fetch("/api/mover/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => null)) as Partial<MoverProfileState> & { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "Could not save profile.");
        return;
      }

      const nextProfile = withReadiness(
        {
          ...profile,
          businessDescription: data?.businessDescription ?? payload.businessDescription,
          contactPerson: data?.contactPerson ?? payload.contactPerson,
          phone: data?.phone ?? payload.phone,
          nzbn: data?.nzbn ?? payload.nzbn,
          yearsOperating: typeof data?.yearsOperating === "number" || data?.yearsOperating === null ? data.yearsOperating : payload.yearsOperating ? Number(payload.yearsOperating) : null,
          serviceAreas: data?.serviceAreas ?? payload.serviceAreas,
          email: data?.email ?? profile.email,
          emailVerified: typeof data?.emailVerified === "boolean" ? data.emailVerified : profile.emailVerified,
          logoUrl: data?.logoUrl ?? profile.logoUrl,
          documents: data?.documents ?? profile.documents,
          companyName: data?.companyName ?? profile.companyName,
        },
        data?.readiness as MoverProfileState["readiness"] | undefined,
      );

      onProfileChange(nextProfile);
      setEditing(false);
      setSuccess("Profile details saved.");
    });
  }

  function handleDocumentChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setDocumentError(null);
    setDocumentSuccess(null);

    if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
      setDocumentError("Upload a PDF, PNG, JPG, or WEBP file.");
      return;
    }

    if (file.size > MAX_DOCUMENT_SIZE) {
      setDocumentError("Please keep documents under 4MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) {
        setDocumentError("We couldn't read that file. Please try another one.");
        return;
      }

      startUploading(async () => {
        const response = await fetch("/api/mover/profile/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: documentType,
            fileName: file.name,
            fileDataUrl: result,
          }),
        });

        const data = (await response.json().catch(() => null)) as { error?: string; document?: ProfileDocument; readiness?: MoverProfileState["readiness"] } | null;
        if (!response.ok || !data?.document) {
          setDocumentError(data?.error ?? "Could not upload that document.");
          return;
        }

        onProfileChange(
          withReadiness(
            {
              ...profile,
              documents: [data.document, ...profile.documents],
            },
            data.readiness,
          ),
        );
        if (data.document.type === documentType) {
          setCategoryDocuments((current) => [data.document!, ...current.filter((document) => document.id !== data.document!.id)]);
        }
        setDocumentSuccess("Document uploaded.");
      });
    };

    reader.readAsDataURL(file);
  }

  async function removeDocument(id: string) {
    setRemovingId(id);
    setDocumentError(null);
    setDocumentSuccess(null);

    try {
      const response = await fetch(`/api/mover/profile/documents/${id}`, { method: "DELETE" });
      const data = (await response.json().catch(() => null)) as { error?: string; readiness?: MoverProfileState["readiness"] } | null;

      if (!response.ok) {
        setDocumentError(data?.error ?? "Could not remove that document.");
        return;
      }

      onProfileChange(
        withReadiness(
          {
            ...profile,
            documents: profile.documents.filter((document) => document.id !== id),
          },
          data?.readiness,
        ),
      );
      setCategoryDocuments((current) => current.filter((document) => document.id !== id));
      setDocumentSuccess("Document removed.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="grid gap-3 sm:gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.88fr)]">
      <div className="order-2 space-y-3 sm:space-y-4 2xl:order-1">
        <section ref={profileSectionRef} tabIndex={-1} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 sm:rounded-[30px] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 sm:text-sm">Business details</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.05em] text-slate-950 sm:text-2xl">Company profile</h2>
            </div>
            {!editing ? (
              <button type="button" onClick={() => { setEditing(true); setError(null); setSuccess(null); resetForm(); }} className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button type="button" onClick={() => { setEditing(false); setError(null); setSuccess(null); resetForm(); }} className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  <X className="h-4 w-4" />
                  Cancel
                </button>
                <button type="button" onClick={saveProfile} disabled={isSaving} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:translate-y-[-1px] disabled:opacity-70">
                  {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {isSaving ? "Saving..." : "Save changes"}
                </button>
              </div>
            )}
          </div>

          <div className="mt-3 grid gap-2 sm:mt-4 sm:gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <EditableField label="Contact name" value={form.contactPerson} editing={editing} onChange={(value) => setForm((current) => ({ ...current, contactPerson: value }))} placeholder="Primary contact" />
            <EditableField label="Phone number" value={form.phone} editing={editing} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} placeholder="+64..." />
            <EditableField label="NZBN" value={form.nzbn} editing={editing} onChange={(value) => setForm((current) => ({ ...current, nzbn: value }))} placeholder="13-digit NZBN" />
            <EditableField label="Years operating" value={form.yearsOperating} editing={editing} onChange={(value) => setForm((current) => ({ ...current, yearsOperating: value }))} placeholder="0" inputMode="numeric" />
          </div>

          <div className="mt-3 rounded-[20px] border border-slate-200 bg-slate-50 p-3 sm:mt-4 sm:rounded-[24px] sm:p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Business description</p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  This appears on the public movers page so customers can learn about your business before requesting quotes.
                </p>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                {form.businessDescription.length}/{BUSINESS_DESCRIPTION_LIMIT}
              </p>
            </div>

            {editing ? (
              <textarea
                value={form.businessDescription}
                onChange={(event) => setForm((current) => ({ ...current, businessDescription: event.target.value.slice(0, BUSINESS_DESCRIPTION_LIMIT) }))}
                rows={6}
                maxLength={BUSINESS_DESCRIPTION_LIMIT}
                className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-slate-500"
                placeholder="Tell customers about your team, the areas you cover, and what makes your moving service stand out."
              />
            ) : (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {profile.businessDescription || "Add a short public summary so customers can get a feel for your business."}
              </p>
            )}
          </div>

          <div className="mt-3 rounded-[20px] border border-slate-200 bg-slate-50 p-3 sm:mt-4 sm:rounded-[24px] sm:p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Coverage regions</p>
            {editing ? (
              <NzRegionSelector
                selectedRegions={form.serviceAreas}
                onChange={(regions) => setForm((current) => ({ ...current, serviceAreas: regions }))}
                className="mt-3 border-none bg-transparent p-0"
                title="Coverage regions"
                description="Pick the NZ regions your team actively covers so customer leads are matched to the right mover."
              />
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.serviceAreas.length ? profile.serviceAreas.map((area) => <span key={area} className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">{formatServiceAreaLabel(area)}</span>) : <p className="text-sm text-slate-500">Add coverage regions.</p>}
              </div>
            )}
            {!editing ? <p className="mt-2 text-xs text-slate-500">Coverage is now managed by official NZ region selection.</p> : null}
          </div>

          {success ? <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{success}</p> : null}
          {error ? <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}
        </section>

        <MoverLogoUpload
          initialLogoUrl={profile.logoUrl}
          onSaved={({ logoUrl, readiness }) => {
            onProfileChange(withReadiness({ ...profile, logoUrl }, readiness as MoverProfileState["readiness"] | undefined));
            setSuccess("Logo saved.");
            setError(null);
          }}
        />

        <section ref={documentsSectionRef} tabIndex={-1} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 sm:rounded-[30px] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 sm:text-sm">Business docs</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.05em] text-slate-950 sm:text-2xl">Documents</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value as typeof documentType)}
                className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none"
              >
                <option value="INSURANCE">Insurance</option>
                <option value="NZBN_PROOF">NZBN proof</option>
                <option value="LICENCE">Licence</option>
                <option value="OTHER">Other</option>
              </select>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:translate-y-[-1px]">
                {isUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isUploading ? "Uploading..." : "Upload document"}
                <input type="file" accept=".pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={handleDocumentChange} disabled={isUploading} />
              </label>
            </div>
          </div>

          <div className="mt-3 rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-3 shadow-sm sm:mt-4 sm:rounded-[24px] sm:p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 sm:text-sm">{selectedDocumentType.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{selectedDocumentType.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedDocumentType.examples.map((example) => (
                <span key={example} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                  {example}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
            {isLoadingDocuments ? (
              <div className="flex min-h-[120px] items-center justify-center rounded-[20px] border border-slate-200 bg-slate-50 sm:rounded-[24px]">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Loading documents...
                </div>
              </div>
            ) : categoryDocuments.length ? (
              categoryDocuments.map((document) => (
                <div key={document.id} className="flex flex-col gap-3 rounded-[20px] border border-slate-200 bg-slate-50 p-3 sm:rounded-[24px] sm:p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white p-3 text-slate-700 shadow-sm">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{document.fileName}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{document.type.replaceAll("_", " ")}</p>
                      <p className="mt-1 text-sm text-slate-500">{formatFileSize(document.fileSize)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a href={document.viewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white">
                      View
                    </a>
                    <button type="button" onClick={() => removeDocument(document.id)} disabled={removingId === document.id} className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-70">
                      {removingId === document.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Remove
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center sm:rounded-[24px] sm:py-8">
                <p className="font-semibold text-slate-900">No documents uploaded for this category yet</p>
                <p className="mt-2 text-sm text-slate-500">Upload {selectedDocumentType.title.toLowerCase()} documents here so this part of your profile is easy to verify.</p>
              </div>
            )}
          </div>

          <p className="mt-3 text-xs text-slate-500">PDF, PNG, JPG, or WEBP up to 4MB. Make sure the file is clear, current, and easy to read.</p>
          {documentSuccess ? <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{documentSuccess}</p> : null}
          {documentError ? <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{documentError}</p> : null}
        </section>
      </div>

      <aside className="order-1 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#fff8ef,#ffffff)] p-4 shadow-sm sm:rounded-[30px] sm:p-5 2xl:order-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-600 sm:text-sm">Profile readiness</p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.05em] text-slate-950 sm:text-2xl">{profile.readiness.completion}% ready</h2>
          </div>
          <div className="rounded-2xl bg-white p-3 text-emerald-700 shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-4 h-3 rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-[linear-gradient(90deg,#f97316,#fb923c)]" style={{ width: `${profile.readiness.completion}%` }} />
        </div>

        <div className="mt-4 space-y-2 sm:mt-5 sm:space-y-3">
          <ReadinessCard title="Email" value={profile.email} status={readinessItems.find((item) => item.key === "email")?.check?.label ?? (profile.emailVerified ? "Verified" : "Needs action")} complete={profile.emailVerified} />
          {readinessItems.filter((item) => item.key !== "email").map((item) => (
            <ReadinessCard key={item.key} title={item.title} value={item.check?.label ?? "Pending"} status={item.check?.complete ? "Complete" : "Needs work"} complete={Boolean(item.check?.complete)} />
          ))}
        </div>
      </aside>
    </div>
  );
}

function EditableField({
  label,
  value,
  editing,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (value: string) => void;
  placeholder: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3 sm:rounded-[24px] sm:p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      {editing ? (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-500"
        />
      ) : (
        <p className="mt-3 break-words text-lg font-black tracking-[-0.04em] text-slate-950">{value || placeholder}</p>
      )}
    </div>
  );
}

function ReadinessCard({ title, value, status, complete }: { title: string; value: string; status: string; complete: boolean }) {
  return (
    <div className={cx("rounded-[20px] border p-3 sm:rounded-[24px] sm:p-4", complete ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white")}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-900">{value}</p>
      <p className={cx("mt-1 text-sm", complete ? "text-emerald-700" : "text-slate-500")}>{status}</p>
    </div>
  );
}
