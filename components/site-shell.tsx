"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Mail, Menu, ShieldCheck, Sparkles, X } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { SITE_EMAILS, toMailto } from "@/lib/site-emails";
import logo from "@/public/logo.webp";

const navLinks = [
  { href: "/contact", label: "Contact us" },
  { href: "/about", label: "About us" },
  { href: "/faq", label: "FAQs" },
  { href: "/terms", label: "Terms" },
];

const footerGroups = [
  {
    title: "Customers",
    links: [
      { href: "/quote", label: "Get Free Moving Quotes" },
      { href: "/movers", label: "Movers Directory" },
      { href: "/#how-it-works", label: "How It Works" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Moving Companies",
    links: [
      { href: "/mover/login", label: "Join as a Mover" },
      { href: "/mover/login", label: "Mover Login" },
      { href: "/mover/pricing", label: "Mover Pricing" },
    ],
  },
  {
    title: "Legal & Compliance",
    links: [
      { href: "/terms", label: "Terms & Conditions" },
      { href: "/privacy", label: "Data Consent & Privacy" },
    ],
  },
] as const;

const contactLinks = [
  { href: toMailto(SITE_EMAILS.support), label: SITE_EMAILS.support },
  { href: toMailto(SITE_EMAILS.partners), label: SITE_EMAILS.partners },
] as const;

export function Nav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <header className="relative bg-white border-b">
      <div className="container-shell flex items-center justify-between gap-3 py-2.5 sm:gap-4 sm:py-3">
        <Link
          href="/"
          className="relative flex h-10 w-[168px] items-center sm:h-12 sm:w-[220px] lg:h-14 lg:w-[265px]"
          aria-label="Match 'n Move home"
        >
          <Image
            src={logo}
            alt="Match 'n Move"
            priority
            fill
            sizes="(min-width: 1024px) 265px, (min-width: 640px) 220px, 168px"
            className="object-contain object-left"
          />
        </Link>
        <nav className="hidden md:flex gap-8 font-semibold">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/mover/login"
            className="whitespace-nowrap rounded-lg bg-accentOrange px-2.5 py-2 text-[0.95rem] font-semibold leading-none text-white shadow-sm sm:rounded sm:px-4 sm:py-2 sm:text-base"
          >
            Mover Login
          </Link>
          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 md:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close navigation overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px] md:hidden"
            />
            <motion.div
              id="mobile-nav"
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 28 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-4 top-[calc(100%+0.75rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 p-3 shadow-[0_24px_70px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl md:hidden"
            >
              <nav className="flex flex-col">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-2xl px-4 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-50"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="relative mt-16 overflow-hidden border-t border-slate-200 bg-[linear-gradient(180deg,#eef5fc_0%,#e6eef8_22%,#dce7f3_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-4%] top-10 h-40 w-40 rounded-full bg-sky-200/55 blur-3xl sm:h-64 sm:w-64" />
        <div className="absolute right-[-2%] top-20 h-44 w-44 rounded-full bg-orange-100/70 blur-3xl sm:h-72 sm:w-72" />
        <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(180deg,rgba(255,255,255,0.55),transparent)]" />
      </div>

      <div className="relative py-12 sm:py-14 lg:py-16">
        <div className="container-shell">
          <div className="grid gap-8 border-b border-slate-300/70 pb-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end lg:gap-12 lg:pb-12">
            <div className="max-w-[42rem]">
              <p className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-white/55 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700 backdrop-blur sm:text-sm">
                <Sparkles className="h-4 w-4" />
                Match &apos;n Move
              </p>
              <h2 className="mt-4 max-w-[12ch] text-[clamp(2.3rem,6vw,4.4rem)] font-black leading-[0.92] tracking-[-0.06em] text-slate-950">
                Plan the move. Book with confidence.
              </h2>
              <p className="mt-4 max-w-[36rem] text-sm leading-7 text-slate-600 sm:text-base">
                Compare moving quotes faster, connect with verified movers, and keep every step of the move feeling simple.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/70 bg-white/60 px-4 py-4 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
                <p className="text-sm font-semibold text-slate-900">100% free for customers</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">Request quotes, compare options, and choose when you&apos;re ready.</p>
              </div>
              <div className="rounded-[24px] border border-white/70 bg-white/60 px-4 py-4 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
                <p className="text-sm font-semibold text-slate-900">Transparent for movers</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">Simple lead pricing with instant access and one month-end invoice.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10 lg:py-12">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-900">{group.title}</h3>
                <nav className="mt-4 flex flex-col gap-3 text-[0.98rem] text-slate-600">
                  {group.links.map((link) => (
                    <Link
                      key={`${group.title}-${link.label}`}
                      href={link.href}
                      className="w-fit transition hover:text-slate-950"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </div>
            ))}

            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-900">Contact</h3>
              <div className="mt-4 flex flex-col gap-3 text-[0.98rem] text-slate-600">
                {contactLinks.map((link) => (
                  <Link key={link.label} href={link.href} className="flex w-fit items-center gap-2 transition hover:text-slate-950">
                    <Mail className="h-4 w-4 text-slate-400" />
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className="mt-6 rounded-[28px] border border-slate-800/10 bg-[linear-gradient(145deg,#0f172a,#152645)] p-5 text-white shadow-[0_24px_44px_-28px_rgba(15,23,42,0.8)]">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
                  <ShieldCheck className="h-4 w-4" />
                  Our Commitment
                </div>
                <p className="mt-3 max-w-[20rem] text-sm leading-6 text-slate-300">
                  A cleaner quote experience for customers and a higher-intent pipeline for moving companies.
                </p>
                <Link
                  href="/quote"
                  className="mt-5 inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-accentOrange px-5 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:bg-orange-500"
                >
                  Get quotes now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-300/70 pt-5 text-sm text-slate-500 lg:flex-row lg:items-center lg:justify-between">
            <p>© 2026 Match &apos;n Move. Built to make moving simpler.</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Link href="/terms" className="transition hover:text-slate-900">
                Terms
              </Link>
              <Link href="/privacy" className="transition hover:text-slate-900">
                Privacy
              </Link>
              <Link href="/contact" className="transition hover:text-slate-900">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return <main><Nav />{children}<Footer /></main>;
}
