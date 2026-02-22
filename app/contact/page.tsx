"use client";
import { SiteShell } from "@/components/site-shell";
import { useState } from "react";

export default function ContactPage() {
  const [ok, setOk] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  return <SiteShell><section className="bg-slateBlue py-16"><div className="container-shell"><h1 className="text-white text-6xl font-bold text-center mb-10">Contact us</h1><div className="grid md:grid-cols-2 gap-5"><div className="card p-6"><h2 className="text-4xl font-bold">Send us a message</h2><div className="space-y-3 mt-4">{["name","email","message"].map((k)=><input key={k} className="w-full border p-3 rounded" placeholder={k} value={(form as any)[k]} onChange={(e)=>setForm({...form,[k]:e.target.value})}/>)}</div><button className="mt-4 bg-accentOrange text-white px-6 py-2 rounded" onClick={async()=>{const r=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)}); setOk(r.ok);}}>Send message</button>{ok && <p className="text-green-600">Sent.</p>}</div><div className="card p-6"><h2 className="text-4xl font-bold">Contact information</h2><p className="mt-4">Call us +64 800 123 456</p><p>Email info@matchnmove.co.nz</p><p>126 Jane Lane, Auckland</p></div></div></div></section></SiteShell>;
}
