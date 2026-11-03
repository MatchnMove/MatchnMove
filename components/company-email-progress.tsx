import { companyEmailProgress, outreachStageNames, type OutreachProgressMessage } from "@/lib/outreach-progress";

function stamp(value: Date | string | null) {
  return value ? new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not sent";
}

export function CompanyEmailProgress({ progress }: { progress?: ReturnType<typeof companyEmailProgress> }) {
  return <div className="min-w-44 text-xs">
    <p className={`font-semibold ${progress?.needsReview ? "text-amber-800" : "text-slate-800"}`}>{progress?.stage || "Not started"}</p>
    {progress?.lastSentAt && <p className="mt-1 text-slate-500">Sent {stamp(progress.lastSentAt)}</p>}
    {progress?.next && <p className="mt-1 text-teal-700">{progress.next}{progress.nextDueAt ? ` · ${stamp(progress.nextDueAt)}` : ""}</p>}
  </div>;
}

export function EmailSequenceTimeline({ messages, nextSequence, status, nextDueAt }: { messages: OutreachProgressMessage[]; nextSequence: number; status: string; nextDueAt: string | null }) {
  return <ol aria-label="Email sequence progress" className="mt-5 grid gap-2 sm:grid-cols-5">
    {outreachStageNames.map((stage, sequence) => {
      const message = messages.find(item => item.sequence === sequence);
      const sent = message?.status === "SENT" && message.sentAt;
      const pending = message && ["DRAFT", "RETRY", "SENDING", "NEEDS_REVIEW"].includes(message.status);
      const current = sequence === nextSequence && status === "ACTIVE";
      const detail = sent ? `Sent ${stamp(message.sentAt)}` : pending ? message.status === "NEEDS_REVIEW" ? "Delivery needs review" : message.status === "SENDING" ? "Sending" : message.status === "RETRY" ? "Retry pending" : "Draft ready" : message?.status === "DISCARDED" ? "Draft removed" : current && nextDueAt ? `Due ${stamp(nextDueAt)}` : sequence === 4 ? "Manual review" : "Not sent";
      return <li key={stage} className={`rounded-xl border p-3 ${sent ? "border-teal-200 bg-teal-50" : pending || current ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}><span className={`mb-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${sent ? "bg-teal-700 text-white" : "bg-white text-slate-500"}`}>{sent ? "✓" : sequence + 1}</span><p className="text-xs font-bold text-slate-800">{stage}</p><p className="mt-1 text-[11px] leading-5 text-slate-600">{detail}</p></li>;
    })}
  </ol>;
}
