import Link from "next/link";
import { SiteShell } from "@/components/site-shell";

export default function Home() {
  return (
    <SiteShell>
      <section className="bg-white">
        <div className="container-shell grid lg:grid-cols-2 gap-6 py-8 items-center">
          <div className="card p-6">
            <span className="inline-block rounded-full bg-slateBlue text-white px-4 py-2 font-semibold">Get free quotes</span>
            <div className="grid gap-3 mt-4">
              <select className="border p-2 rounded"><option>I want to move</option></select>
              <div className="grid grid-cols-2 gap-2"><select className="border p-2 rounded"><option>Move from</option></select><select className="border p-2 rounded"><option>Move to</option></select></div>
              <Link href="/quote" className="bg-brandBlue text-white px-5 py-2 rounded w-fit">Next</Link>
            </div>
          </div>
          <div className="h-72 rounded-xl bg-[url('https://images.unsplash.com/photo-1616161610002-c6df88888cc4?q=80&w=1470')] bg-cover bg-center" />
        </div>
      </section>
      <section className="bg-slateBlue text-white"><div className="container-shell py-8 grid md:grid-cols-3 gap-4 text-center">{["Tell Us About Your Move", "Compare Quotes", "Choose & Save"].map((t,i)=><div key={t} className="card text-slate-900 p-4"><p className="font-bold">{i+1} {t}</p></div>)}</div></section>
      <section className="bg-slateBlue text-white py-10"><div className="container-shell"><h2 className="text-5xl font-bold text-center mb-8">Why choose us?</h2><div className="grid md:grid-cols-3 gap-4">{["Trusted movers","Quick and easy","No obligation"].map(t=><div className="card p-8 text-slate-900 text-3xl font-semibold" key={t}>{t}</div>)}</div></div></section>
      <section className="bg-white"><div className="container-shell grid md:grid-cols-2 gap-5 py-10"><div><h3 className="text-5xl font-bold">Thinking about advertising your moving business?</h3><ul className="list-disc ml-5 mt-4 space-y-1"><li>Get high-intent leads</li><li>No contracts, pay only for verified leads.</li></ul><Link href="/mover/login" className="mt-4 inline-block rounded bg-green-500 text-white px-6 py-3">Join as a mover</Link></div><div className="h-80 rounded-xl bg-[url('https://images.unsplash.com/photo-1600518464441-9154a4dea21b?q=80&w=1469')] bg-cover bg-center"/></div></section>
    </SiteShell>
  );
}
