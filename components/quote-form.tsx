"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Form = Record<string, any>;
const init: Form = {
  name: "", email: "", phone: "", fromPropertyType: "Apartment", toPropertyType: "House", bedrooms: "1",
  fromAddress: "", fromCity: "", fromRegion: "", fromPostcode: "", fromCountry: "New Zealand",
  toAddress: "", toCity: "", toRegion: "", toPostcode: "", toCountry: "New Zealand", moveDate: "", dateFlexible: false, movingWhat: ""
};

export function QuoteForm() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>(init);
  const [loading, setLoading] = useState(false);
  const [voiceState, setVoiceState] = useState<"idle"|"listening"|"transcribing"|"complete">("idle");
  const router = useRouter();

  const update = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const transcribe = async () => {
    setVoiceState("listening");
    const res = await fetch("/api/transcription/session", { method: "POST" });
    const data = await res.json();
    setVoiceState("transcribing");
    setTimeout(() => {
      setVoiceState("complete");
      if (data.extractedFields) setForm((f) => ({ ...f, ...data.extractedFields }));
    }, 1200);
  };

  const submit = async () => {
    setLoading(true);
    const res = await fetch("/api/quote-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setLoading(false);
    if (res.ok) router.push("/thank-you");
  };

  return (
    <div className="bg-slateBlue min-h-screen py-10">
      <div className="container-shell text-white">
        <p className="text-2xl max-w-2xl mb-6">Fill in your details or click the button to transcribe with our handy AI companion</p>
        <button onClick={transcribe} className="mb-4 rounded bg-brandBlue px-5 py-2">Transcribe by voice</button>
        <span className="ml-3 uppercase text-xs">{voiceState}</span>
        <div className="max-w-2xl card p-6 text-slate-900">
          <h2 className="text-4xl mb-4">Step {step}/3</h2>
          {step === 1 && <div className="space-y-3">{["name", "email", "phone"].map((k) => <input key={k} className="w-full border p-3 rounded" placeholder={k} value={form[k]} onChange={(e) => update(k, e.target.value)} />)}<button className="bg-accentOrange text-white px-6 py-2 rounded" onClick={() => setStep(2)}>Next</button></div>}
          {step === 2 && <div className="grid gap-3">{["fromPropertyType", "bedrooms", "fromAddress", "fromCity", "fromRegion", "fromPostcode", "fromCountry"].map((k) => <input key={k} className="w-full border p-3 rounded" placeholder={k} value={form[k]} onChange={(e) => update(k, e.target.value)} />)}<button className="bg-accentOrange text-white px-6 py-2 rounded" onClick={() => setStep(3)}>Next</button></div>}
          {step === 3 && <div className="grid gap-3">{["toAddress", "toCity", "toRegion", "toPostcode", "toCountry", "toPropertyType", "moveDate", "movingWhat"].map((k) => <input key={k} className="w-full border p-3 rounded" placeholder={k} value={form[k]} onChange={(e) => update(k, e.target.value)} />)}
            <label className="flex gap-2"><input type="checkbox" checked={form.dateFlexible} onChange={(e) => update("dateFlexible", e.target.checked)} /> Date flexible</label>
            <button disabled={loading} className="bg-accentOrange text-white px-6 py-2 rounded">{loading ? "Submitting..." : "Submit"}</button></div>}
        </div>
      </div>
    </div>
  );
}
