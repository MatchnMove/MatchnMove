"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronDown, Mail, Menu, ShieldCheck, Sparkles, UserRound, X } from "lucide-react";
import { ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { LanguageSelector } from "@/components/language-selector";
import { useLanguage } from "@/components/language-provider";
import { SITE_EMAILS, toMailto } from "@/lib/site-emails";
import logo from "@/public/logo.webp";

type MoverSessionState = {
  authenticated: boolean;
  accountName?: string;
  accountType?: "admin" | "mover" | "cleaner";
};

const navGroups = [
  {
    label: "Get moving",
    links: [
      { href: "/quote", label: "Get free moving quotes", copy: "Tell us about your move once." },
      { href: "/cleaning-quotes", label: "Move-out cleaning quotes", copy: "Get the move and the clean organised together." },
      { href: "/#how-it-works", label: "How it works", copy: "See the three simple steps." },
      { href: "/faq", label: "Moving FAQs", copy: "Quick answers before you begin." },
    ],
  },
  {
    label: "Find movers",
    links: [
      { href: "/movers", label: "Movers directory", copy: "Browse public mover profiles." },
      { href: "/#mover-reviews", label: "Mover reviews", copy: "Compare verified customer feedback." },
      { href: "/moving-quotes/auckland", label: "Auckland moving quotes", copy: "Find movers for Auckland routes." },
      { href: "/moving-quotes/wellington", label: "Wellington moving quotes", copy: "Find movers for Wellington routes." },
      { href: "/moving-quotes/canterbury", label: "Christchurch moving quotes", copy: "Find movers for Canterbury routes." },
    ],
  },
  {
    label: "Resources",
    links: [
      { href: "/resources", label: "All moving resources", copy: "Guides and planning tools in one place." },
      { href: "/resources#cleaning-guides", label: "Cleaning guides", copy: "Move-out checklists, costs, and practical cleaning advice." },
      { href: "/resources/moving-cost-calculator", label: "Moving cost calculator", copy: "Build a broad moving budget." },
      { href: "/resources/nz-moving-costs-2026", label: "NZ moving costs 2026", copy: "Understand common price drivers." },
      { href: "/resources/moving-house-checklist", label: "Moving-house checklist", copy: "Stay organised before moving day." },
      { href: "/resources/inter-island-moving-guide", label: "Inter-Island guide", copy: "Plan a move between the islands." },
    ],
  },
  {
    label: "About",
    links: [
      { href: "/about", label: "About Match 'n Move", copy: "Why we built a simpler way to move." },
      { href: "/contact", label: "Contact us", copy: "Talk with the Match 'n Move team." },
      { href: "/mover/pricing", label: "Mover pricing", copy: "Information for moving companies." },
      { href: "/mover/login?mode=signup", label: "Partner signup", copy: "Moving and cleaning companies choose their account type here." },
      { href: "/mover/login?mode=login", label: "Partner login", copy: "Access your mover or cleaner dashboard." },
    ],
  },
] as const;

const footerGroups = [
  {
    title: "Customers",
    links: [
      { href: "/quote", label: "Get Free Moving Quotes" },
      { href: "/movers", label: "Movers Directory" },
      { href: "/#how-it-works", label: "How It Works" },
      { href: "/faq", label: "FAQ" },
      { href: "/resources", label: "Moving Resources" },
      { href: "/resources/moving-cost-calculator", label: "Cost Calculator" },
      { href: "/moving-quotes/auckland", label: "Auckland Moving Quotes" },
      { href: "/moving-quotes/wellington", label: "Wellington Moving Quotes" },
      { href: "/moving-quotes/canterbury", label: "Christchurch Moving Quotes" },
      { href: "/cleaning-quotes", label: "Move-out Cleaning Quotes" },
    ],
  },
  {
    title: "Guides & Tools",
    links: [
      { href: "/resources/nz-moving-costs-2026", label: "NZ Moving Costs 2026" },
      { href: "/resources/moving-house-checklist", label: "Moving Checklist" },
      { href: "/resources/inter-island-moving-guide", label: "Inter-Island Guide" },
      { href: "/resources/compare-moving-quotes", label: "Compare Moving Quotes" },
      { href: "/resources/move-out-cleaning-checklist-nz", label: "Move-out Cleaning Checklist" },
    ],
  },
  {
    title: "Moving Companies",
    links: [
      { href: "/mover/login?mode=signup", label: "Join as a Mover" },
      { href: "/mover/login?mode=login", label: "Mover Login" },
      { href: "/mover/pricing", label: "Mover Pricing" },
    ],
  },
  {
    title: "Cleaning Companies",
    links: [
      { href: "/cleaner/register", label: "Join as a Cleaner" },
      { href: "/cleaner/login", label: "Cleaner Login" },
      { href: "/cleaning-quotes", label: "How Cleaning Quotes Work" },
      { href: "/resources", label: "Cleaning Guides" },
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

const publicShellLabelKeys: Record<string, string> = {
  "Get moving": "publicShell.getMoving",
  "Find movers": "publicShell.findMovers",
  Resources: "publicShell.resources",
  About: "publicShell.about",
  "Movers directory": "publicShell.moversDirectory",
  "Movers Directory": "publicShell.moversDirectory",
  "Get Free Moving Quotes": "nav.getQuotes",
  "Move-out Cleaning Quotes": "nav.cleaningQuotes",
  "Cleaning Guides": "nav.cleaningGuides",
  "Cleaner Login": "nav.cleanerLogin",
  "Moving FAQs": "publicShell.movingFaqs",
  "All moving resources": "publicShell.allResources",
  "Moving Resources": "publicShell.allResources",
  "How it works": "publicShell.howItWorks",
  "How It Works": "publicShell.howItWorks",
  "Mover reviews": "publicShell.moverReviews",
  "About Match 'n Move": "publicShell.aboutUs",
  "Contact us": "publicShell.contactUs",
  "Mover pricing": "publicShell.moverPricing",
  "Mover Pricing": "publicShell.moverPricing",
  Customers: "publicShell.customers",
  "Guides & Tools": "publicShell.guidesTools",
  "Moving Companies": "publicShell.movingCompanies",
  "Cleaning Companies": "publicShell.cleaningCompanies",
  "Legal & Compliance": "publicShell.legal",
  Contact: "publicShell.contact",
  Terms: "publicShell.terms",
  "Terms & Conditions": "publicShell.terms",
  Privacy: "publicShell.privacy",
  "Data Consent & Privacy": "publicShell.privacy",
};

function translatePublicShellLabel(t: (key: string) => string, label: string) {
  const key = publicShellLabelKeys[label];
  return key ? t(key) : label;
}

export function Nav() {
  const pathname = usePathname();
  const logoFilterId = useId();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moverSession, setMoverSession] = useState<MoverSessionState | null>(null);
  const sessionRequestRef = useRef(0);

  const moverAccountHref = moverSession?.authenticated
    ? moverSession.accountType === "admin"
      ? "/admin/verification"
      : moverSession.accountType === "cleaner"
        ? "/cleaner/dashboard"
        : "/mover/dashboard"
    : "/mover/login";
  const moverAccountLabel =
    moverSession?.authenticated && moverSession.accountName
      ? moverSession.accountType === "admin"
        ? `Admin: ${moverSession.accountName}`
        : moverSession.accountName
      : "Partner portal";
  const getNavLinkLabel = (href: string, fallback: string) => {
    if (href === "/quote") return t("nav.getQuotes");
    if (href === "/cleaning-quotes") return t("nav.cleaningQuotes");
    if (href === "/resources#cleaning-guides") return t("nav.cleaningGuides");
    if (href === "/cleaner/login") return t("nav.cleanerLogin");
    return translatePublicShellLabel(t, fallback);
  };

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

  const loadMoverSession = useCallback(async () => {
    const requestId = ++sessionRequestRef.current;

    try {
      const response = await fetch("/api/mover/session", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = (await response.json().catch(() => null)) as MoverSessionState | null;

      if (requestId === sessionRequestRef.current) {
        setMoverSession(data?.authenticated ? data : { authenticated: false });
      }
    } catch {
      if (requestId === sessionRequestRef.current) {
        setMoverSession({ authenticated: false });
      }
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMoverSession();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadMoverSession, pathname]);

  useEffect(() => {
    const refreshRestoredSession = () => {
      void loadMoverSession();
    };
    const refreshVisibleSession = () => {
      if (document.visibilityState === "visible") {
        void loadMoverSession();
      }
    };

    window.addEventListener("pageshow", refreshRestoredSession);
    window.addEventListener("focus", refreshRestoredSession);
    document.addEventListener("visibilitychange", refreshVisibleSession);

    return () => {
      window.removeEventListener("pageshow", refreshRestoredSession);
      window.removeEventListener("focus", refreshRestoredSession);
      document.removeEventListener("visibilitychange", refreshVisibleSession);
    };
  }, [loadMoverSession]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-[0_10px_30px_-28px_rgba(15,23,42,0.5)] backdrop-blur-xl">
      <svg aria-hidden="true" focusable="false" className="pointer-events-none absolute h-0 w-0">
        <defs>
          <filter id={logoFilterId} colorInterpolationFilters="sRGB">
            {/* Remove the white image background while retaining the saturated brand colours. */}
            <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 -1 -1 0 3" result="withoutWhite" />
            <feComposite in="withoutWhite" in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
      </svg>
      <div className="container-shell flex items-center justify-between gap-3 py-2.5 sm:gap-4 sm:py-3">
        <Link
          href="/"
          className="relative flex h-9 w-[158px] items-center sm:h-12 sm:w-[220px] lg:h-14 lg:w-[265px]"
          aria-label={t("publicShell.home")}
        >
          <Image
            src={logo}
            alt="Match 'n Move"
            priority
            fill
            sizes="(min-width: 1024px) 265px, (min-width: 640px) 220px, 168px"
            className="object-contain object-left"
            style={{ filter: `url(#${logoFilterId})` }}
          />
        </Link>
        <nav className="hidden items-center gap-0.5 rounded-full border border-slate-200/80 bg-slate-50/80 p-1 font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] lg:flex" aria-label={t("publicShell.mainNavigation")}>
          {navGroups.map((group) => (
            <div key={group.label} className="group relative">
              <button
                type="button"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white hover:text-slate-950 hover:shadow-sm focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBlue/30 lg:px-4 lg:text-[0.95rem]"
              >
                {translatePublicShellLabel(t, group.label)}
                <ChevronDown className="h-4 w-4 text-slate-400 transition duration-200 group-hover:rotate-180 group-focus-within:rotate-180" />
              </button>
              <div className="pointer-events-none invisible absolute left-1/2 top-full z-50 w-[21rem] -translate-x-1/2 translate-y-2 rounded-[22px] border border-slate-200 bg-white p-2 opacity-0 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.35)] transition duration-200 group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                <div className="p-2">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-sky-700">{translatePublicShellLabel(t, group.label)}</p>
                </div>
                {group.links.map((link, index) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block rounded-2xl px-4 py-3 transition hover:bg-sky-50 focus-visible:bg-sky-50 focus-visible:outline-none ${
                      group.label === "Find movers" && index === 0 ? "bg-[linear-gradient(135deg,#eff8ff,#f0fdf4)]" : ""
                    }`}
                  >
                    <span className="block text-sm font-bold text-slate-950">{getNavLinkLabel(link.href, link.label)}</span>
                    <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">{link.copy}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSelector compact className="hidden lg:inline-flex" />
          <Link
            href="/quote"
            className="hidden min-h-[44px] items-center justify-center gap-2 rounded-full bg-brandBlue px-5 py-2.5 text-[0.92rem] font-bold leading-none text-white shadow-[0_14px_28px_-18px_rgba(47,115,255,0.8)] transition hover:-translate-y-0.5 hover:bg-indigo-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 sm:inline-flex lg:hidden xl:inline-flex"
          >
            {t("nav.getQuotes")}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={moverAccountHref}
            title={moverAccountLabel}
            className="hidden min-h-[44px] max-w-[13rem] items-center gap-2 whitespace-nowrap rounded-full border border-orange-600/15 bg-accentOrange px-4 py-2.5 text-[0.88rem] font-bold leading-none text-white shadow-[0_14px_28px_-20px_rgba(222,122,58,0.8)] transition hover:-translate-y-0.5 hover:bg-[#d96f31] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 md:inline-flex lg:max-w-[16rem] lg:px-5"
          >
            <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{moverAccountLabel}</span>
          </Link>
          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav"
            aria-label={mobileMenuOpen ? t("publicShell.closeMenu") : t("publicShell.openMenu")}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#07162b] text-white shadow-[0_8px_18px_-10px_rgba(7,22,43,0.8)] transition hover:bg-slate-800 md:h-10 md:w-10 lg:hidden"
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
              aria-label={t("publicShell.closeOverlay")}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px] lg:hidden"
            />
            <motion.div
              id="mobile-nav"
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 28 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-4 top-[calc(100%+0.75rem)] z-50 max-h-[calc(100svh-6rem)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-[28px] border border-slate-200 bg-white/95 p-3 shadow-[0_24px_70px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl lg:hidden"
            >
              <nav className="flex flex-col">
                <LanguageSelector className="mb-3 w-full" />
                <Link
                  href="/quote"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mb-2 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-brandBlue px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brandBlue/90"
                >
                  {t("nav.getQuotes")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/movers"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mb-3 rounded-[22px] border border-sky-200 bg-[linear-gradient(135deg,#eff8ff,#f0fdf4)] p-4 shadow-sm"
                >
                  <span className="flex items-center justify-between gap-3 text-base font-black text-slate-950">
                    {t("publicShell.moversDirectory")}
                    <ArrowRight className="h-4 w-4 text-sky-700" />
                  </span>
                  <span className="mt-1.5 block text-sm leading-6 text-slate-600">Browse mover profiles, service areas, and public reviews.</span>
                </Link>
                {navGroups.map((group) => (
                  <div key={group.label} className="border-t border-slate-200 px-1 py-3 first:border-t-0">
                    <p className="px-3 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-slate-400">{translatePublicShellLabel(t, group.label)}</p>
                    <div className="mt-1.5 grid gap-0.5">
                      {group.links.filter((link) => link.href !== "/quote" && link.href !== "/movers").map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                        >
                          {getNavLinkLabel(link.href, link.label)}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
                <Link
                  href={moverAccountHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="mt-2 inline-flex min-h-[46px] items-center justify-center rounded-2xl bg-accentOrange px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-orange-500"
                >
                  <span className="truncate">{moverAccountLabel}</span>
                </Link>
              </nav>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="relative mt-10 overflow-hidden border-t border-slate-200 bg-[linear-gradient(180deg,#eef5fc_0%,#e6eef8_22%,#dce7f3_100%)] sm:mt-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-4%] top-10 h-40 w-40 rounded-full bg-sky-200/55 blur-3xl sm:h-64 sm:w-64" />
        <div className="absolute right-[-2%] top-20 h-44 w-44 rounded-full bg-orange-100/70 blur-3xl sm:h-72 sm:w-72" />
        <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(180deg,rgba(255,255,255,0.55),transparent)]" />
      </div>

      <div className="relative py-10 sm:py-14 lg:py-16">
        <div className="container-shell">
          <div className="grid gap-8 border-b border-slate-300/70 pb-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end lg:gap-12 lg:pb-12">
            <div className="max-w-[42rem]">
              <p className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-white/55 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700 backdrop-blur sm:text-sm">
                <Sparkles className="h-4 w-4" />
                Match &apos;n Move
              </p>
              <h2 className="mt-4 max-w-[13ch] text-[clamp(2rem,9vw,4.4rem)] font-black leading-[0.96] tracking-[-0.035em] text-slate-950 sm:max-w-[12ch] sm:leading-[0.92] sm:tracking-[-0.06em]">
                {t("publicShell.heroTitle")}
              </h2>
              <p className="mt-4 max-w-[36rem] text-sm leading-7 text-slate-600 sm:text-base">
                {t("publicShell.heroCopy")}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/70 bg-white/60 px-4 py-4 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
                <p className="text-sm font-semibold text-slate-900">{t("publicShell.freeCustomers")}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{t("publicShell.freeCustomersCopy")}</p>
              </div>
              <div className="rounded-[24px] border border-white/70 bg-white/60 px-4 py-4 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
                <p className="text-sm font-semibold text-slate-900">{t("publicShell.transparentMovers")}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{t("publicShell.transparentMoversCopy")}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-8 py-10 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(5,minmax(0,1fr))_minmax(260px,1.5fr)] xl:gap-6 xl:py-12">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-900">{translatePublicShellLabel(t, group.title)}</h3>
                <nav className="mt-4 flex flex-col gap-3 text-[0.98rem] text-slate-600">
                  {group.links.map((link) => (
                    <Link
                      key={`${group.title}-${link.label}`}
                      href={link.href}
                      className="w-fit transition hover:text-slate-950"
                    >
                      {translatePublicShellLabel(t, link.label)}
                    </Link>
                  ))}
                </nav>
              </div>
            ))}

            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-900">{t("publicShell.contact")}</h3>
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
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  {t("publicShell.commitment")}
                </div>
                <p className="mt-3 max-w-[20rem] text-sm leading-6 text-slate-300">
                  {t("publicShell.commitmentCopy")}
                </p>
                <Link
                  href="/quote"
                  className="mt-5 inline-flex min-h-[46px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-accentOrange px-5 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:bg-orange-500"
                >
                  {t("publicShell.getQuotesNow")}
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-300/70 pt-5 text-sm text-slate-500 lg:flex-row lg:items-center lg:justify-between">
            <p>{t("publicShell.copyright")}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Link href="/terms" className="transition hover:text-slate-900">
                {t("publicShell.terms")}
              </Link>
              <Link href="/privacy" className="transition hover:text-slate-900">
                {t("publicShell.privacy")}
              </Link>
              <Link href="/contact" className="transition hover:text-slate-900">
                {t("publicShell.contact")}
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
