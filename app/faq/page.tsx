"use client";
import { SiteShell } from "@/components/site-shell";
import { useState } from "react";

const faqs = [
  ["Who / What is Match’nMove?", "An independent, unbiased quotes distribution system."],
  ["In which areas are operational?", "Nationwide across New Zealand."],
  ["What is the cost?", "Nothing. It is free for customers."],
  ["How are payments handled?", "You deal directly with chosen mover."],
  ["Will my details be secure?", "Details are only sent to selected movers."],
  ["How soon can I expect quotations?", "Usually within 24 hours."]
];

export default function FAQPage(){const [open,setOpen]=useState<number|null>(null);return <SiteShell><section className="bg-slateBlue py-8"><div className="container-shell"><h1 className="text-6xl text-white text-center font-bold">Top searches</h1><div className="grid md:grid-cols-3 gap-4 mt-8">{faqs.map(([q,a],i)=><button key={q} className="card p-5 text-left" onClick={()=>setOpen(open===i?null:i)}><h3 className="font-bold text-2xl">{q}</h3>{open===i && <p className="mt-2">{a}</p>}</button>)}</div></div></section></SiteShell>}
