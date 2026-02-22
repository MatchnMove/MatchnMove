import Link from "next/link";
import { ReactNode } from "react";

export function Nav() {
  return (
    <header className="bg-white border-b">
      <div className="container-shell py-4 flex items-center justify-between gap-4">
        <Link href="/" className="text-3xl font-black text-slate-800">Match’nMove</Link>
        <nav className="hidden md:flex gap-8 font-semibold">
          <Link href="/contact">Contact us</Link><Link href="/about">About us</Link><Link href="/faq">FAQ's</Link><Link href="/terms">Terms</Link>
        </nav>
        <Link href="/mover/login" className="rounded bg-accentOrange px-4 py-2 text-white font-semibold">Mover Login</Link>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-zinc-300 mt-16">
      <div className="container-shell py-10 grid md:grid-cols-5 gap-8 text-sm">
        <div><h4 className="font-bold mb-2">Customers</h4><p>Get Free Moving Quotes</p><p>How It Works</p><p>FAQ</p></div>
        <div><h4 className="font-bold mb-2">Moving Companies</h4><p>Join as a Mover</p><p>Mover Login</p><p>Lead Pricing</p></div>
        <div><h4 className="font-bold mb-2">Legal & Compliance</h4><p>Terms & Conditions</p><p>Data Consent & Privacy</p></div>
        <div><h4 className="font-bold mb-2">Contact</h4><p>support@matchnmove.co.nz</p><p>partners@matchnmove.co.nz</p></div>
        <div><h4 className="font-bold mb-2">Our Commitment</h4><p>100% free for customers</p><p>Transparent pricing for movers</p><Link href="/quote" className="inline-block mt-3 rounded bg-accentOrange px-4 py-2 text-white">Get quotes now</Link></div>
      </div>
    </footer>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return <main><Nav />{children}<Footer /></main>;
}
