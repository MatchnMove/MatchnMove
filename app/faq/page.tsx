"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Clock3,
  MapPinned,
  Search,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { SITE_EMAILS } from "@/lib/site-emails";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  blurb: string;
  tags: string[];
  followUps: Array<{
    id: string;
    label: string;
  }>;
};

const faqItems: FaqItem[] = [
  {
    id: "what-is-matchnmove",
    question: "Who or what is Match 'n Move?",
    blurb: "A quick overview of how Match 'n Move helps people compare mover quotes in one place.",
    answer:
      "Match 'n Move is an independent quote-matching platform for people who need furniture removal pricing. Instead of contacting multiple companies one by one, you can send one request and receive quotations from moving companies through a single application. It works like a streamlined broker experience, but without a middleman fee because the service is free to use.",
    tags: ["matchnmove", "about", "broker", "quotes", "how it works"],
    followUps: [
      { id: "where-do-you-operate", label: "Service areas" },
      { id: "what-does-it-cost", label: "What it costs" },
      { id: "are-my-details-secure", label: "Data privacy" }
    ]
  },
  {
    id: "where-do-you-operate",
    question: "In which areas is Match 'n Move operational?",
    blurb: "Coverage across New Zealand, including local and long-distance relocations.",
    answer:
      "Match 'n Move operates nationwide across New Zealand, from the North Island to the South Island. The network includes companies that specialise in long-distance removals as well as smaller moving firms focused on local jobs. Once you complete the easy steps, you can compare options that suit your route and move size.",
    tags: ["areas", "locations", "nationwide", "new zealand", "north island", "south island"],
    followUps: [
      { id: "what-does-it-cost", label: "Free service?" },
      { id: "when-will-i-get-quotes", label: "Quote timing" },
      { id: "is-there-a-size-limit", label: "Move size" }
    ]
  },
  {
    id: "what-does-it-cost",
    question: "What does it cost to obtain quotations?",
    blurb: "Using Match 'n Move to request moving quotes does not cost customers anything.",
    answer: "Nothing. Requesting quotations through Match 'n Move is completely free for customers.",
    tags: ["cost", "price", "free", "fees", "charges"],
    followUps: [
      { id: "how-do-payments-work", label: "How payments work" },
      { id: "when-will-i-get-quotes", label: "When quotes arrive" },
      { id: "what-is-matchnmove", label: "How it works" }
    ]
  },
  {
    id: "how-do-payments-work",
    question: "Once I choose a removal company, who do I pay?",
    blurb: "Payments go directly to the moving company you appoint, not to Match 'n Move.",
    answer:
      "Once you select the quotation that best suits your needs, you deal directly with that moving company for payment and next steps. Match 'n Move steps back once the connection is made, although you are always welcome to share feedback or suggestions with the team afterward.",
    tags: ["payment", "pay", "invoice", "removal company", "bookings"],
    followUps: [
      { id: "what-does-it-cost", label: "Service cost" },
      { id: "are-my-details-secure", label: "Privacy" },
      { id: "how-often-can-i-use-it", label: "Use it again?" }
    ]
  },
  {
    id: "are-my-details-secure",
    question: "Will my personal details be secure?",
    blurb: "Your details are only shared with relevant moving companies listed on Match 'n Move.",
    answer:
      "Your personal details are only sent to companies listed on Match 'n Move that are relevant to your request. They are not distributed to unrelated companies or individuals. For full detail on how information is handled, you can also review the Terms & Conditions and Privacy Policy.",
    tags: ["privacy", "secure", "security", "details", "personal information"],
    followUps: [
      { id: "what-is-matchnmove", label: "What is Match 'n Move?" },
      { id: "when-will-i-get-quotes", label: "Quote timing" },
      { id: "how-do-payments-work", label: "Payments" }
    ]
  },
  {
    id: "when-will-i-get-quotes",
    question: "How soon can I expect my quotations?",
    blurb: "Most moving companies are asked to respond within 24 hours.",
    answer:
      `Match 'n Move asks moving companies to respond to quotation requests within 24 hours. If you have not received quotations within 24 to 48 hours, you can contact the team at ${SITE_EMAILS.feedback} so they can help follow up.`,
    tags: ["how soon", "24 hours", "48 hours", "quote timing", "response time"],
    followUps: [
      { id: "where-do-you-operate", label: "Coverage" },
      { id: "what-does-it-cost", label: "Any cost?" },
      { id: "are-my-details-secure", label: "Are details safe?" }
    ]
  },
  {
    id: "how-often-can-i-use-it",
    question: "How often can I use this service?",
    blurb: "You can request quotes whenever you need a relocation company.",
    answer:
      "You can use Match 'n Move as often as you need a relocation company. Just keep in mind that quotations may vary from one request to the next because moving companies price based on factors like distance, demand, peak seasons, and preferred booking slots.",
    tags: ["repeat use", "multiple quotes", "how often", "book again"],
    followUps: [
      { id: "how-do-payments-work", label: "Payments" },
      { id: "when-will-i-get-quotes", label: "Quote timing" },
      { id: "is-there-a-size-limit", label: "Move size" }
    ]
  },
  {
    id: "is-there-a-size-limit",
    question: "Is there a limit on the size of my move?",
    blurb: "Quotes are available for both small and large household or office moves.",
    answer:
      "There is no strict size limit, as long as the request relates to the removal of household or office furniture and goods. Whether your move is big or small, you can still request a quote through the platform.",
    tags: ["size", "small move", "large move", "office", "household"],
    followUps: [
      { id: "where-do-you-operate", label: "Where available?" },
      { id: "how-often-can-i-use-it", label: "Use it again?" },
      { id: "when-will-i-get-quotes", label: "When quotes arrive" }
    ]
  }
];

const featuredFaqIds = [
  "what-is-matchnmove",
  "where-do-you-operate",
  "what-does-it-cost",
  "how-do-payments-work",
  "are-my-details-secure",
  "when-will-i-get-quotes"
] as const;

const helpfulTips = [
  {
    title: "Be specific in your request",
    copy: "Accurate inventory details, access notes, and dates help movers return more reliable quotes faster."
  },
  {
    title: "Compare more than price",
    copy: "Response speed, service area fit, and communication quality can matter just as much as the number on the quote."
  },
  {
    title: "Book early for busy periods",
    copy: "Peak seasons and popular moving dates can affect availability and pricing, so earlier requests usually create better options."
  }
] as const;

export default function FAQPage() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string>(faqItems[0]?.id ?? "");
  const [expandedFeaturedId, setExpandedFeaturedId] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [isMobilePlaceholder, setIsMobilePlaceholder] = useState(false);

  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const featuredFaqs = useMemo(
    () =>
      featuredFaqIds
        .map((id) => faqItems.find((item) => item.id === id))
        .filter((item): item is FaqItem => Boolean(item)),
    []
  );

  const filteredFaqs = useMemo(() => {
    if (!deferredQuery) {
      return faqItems;
    }

    return faqItems.filter((item) => {
      const haystack = `${item.question} ${item.answer} ${item.blurb} ${item.tags.join(" ")}`.toLowerCase();
      return haystack.includes(deferredQuery);
    });
  }, [deferredQuery]);

  const activeItem = deferredQuery
    ? filteredFaqs.find((item) => item.id === openId) ?? filteredFaqs[0]
    : faqItems.find((item) => item.id === openId) ?? featuredFaqs[0] ?? faqItems[0];

  const handleQuickSearch = (item: FaqItem) => {
    setQuery(item.question);
    setOpenId(item.id);
    setExpandedFeaturedId((current) => (current === item.id ? null : item.id));
    setSearchHistory((current) => [item.id, ...current.filter((historyId) => historyId !== item.id)].slice(0, 6));
  };

  const searchPreviewItems = deferredQuery ? filteredFaqs.slice(0, 4) : featuredFaqs.slice(0, 3);
  const historyItems = searchHistory
    .map((id) => faqItems.find((item) => item.id === id))
    .filter((item): item is FaqItem => Boolean(item));
  const followUpItems =
    activeItem?.followUps
      .map((followUp) => {
        const item = faqItems.find((faqItem) => faqItem.id === followUp.id);
        return item ? { item, label: followUp.label } : null;
      })
      .filter((entry): entry is { item: FaqItem; label: string } => Boolean(entry)) ?? [];

  const updateQuery = (nextQuery: string) => {
    setQuery(nextQuery);

    const normalizedQuery = nextQuery.trim().toLowerCase();
    if (normalizedQuery.length < 4) {
      return;
    }

    const nextMatch = faqItems.find((item) => {
      const haystack = `${item.question} ${item.answer} ${item.blurb} ${item.tags.join(" ")}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });

    if (!nextMatch) {
      return;
    }

    setOpenId(nextMatch.id);
    setSearchHistory((current) => [nextMatch.id, ...current.filter((historyId) => historyId !== nextMatch.id)].slice(0, 6));
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const syncPlaceholder = () => setIsMobilePlaceholder(mediaQuery.matches);

    syncPlaceholder();
    mediaQuery.addEventListener("change", syncPlaceholder);

    return () => mediaQuery.removeEventListener("change", syncPlaceholder);
  }, []);

  return (
    <SiteShell>
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#44586a_0%,#3d5061_100%)] pb-16 pt-14 text-white sm:pb-20 sm:pt-16 lg:pb-36 lg:pt-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[4%] top-14 h-40 w-40 rounded-full bg-sky-300/18 blur-3xl sm:h-64 sm:w-64" />
          <div className="absolute right-[6%] top-12 h-44 w-44 rounded-full bg-emerald-300/14 blur-3xl sm:h-72 sm:w-72" />
          <div className="absolute inset-x-0 top-0 h-36 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent)]" />
        </div>

        <div className="container-shell relative">
          <div className="mx-auto max-w-4xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-100 backdrop-blur sm:text-sm">
              <Sparkles className="h-4 w-4" />
              Helpful tips and answers
            </p>
            <h1 className="mt-5 text-[clamp(2.8rem,8vw,5.5rem)] font-black leading-[0.92] tracking-[-0.06em] text-white">
              Search the questions people ask before they move.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
              Match &apos;n Move often receives questions about quotes, timing, privacy, and how the platform works. Start
              typing and the most relevant answers appear right away.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-6xl overflow-visible rounded-[32px] border border-white/15 bg-white/[0.08] p-4 shadow-[0_30px_90px_-48px_rgba(15,23,42,0.72)] backdrop-blur-xl sm:p-5">
            <div className="rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.92))] p-4 text-slate-900 sm:p-6">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.62fr)] xl:items-start">
                <div className="min-w-0">
                  <div className="relative">
                    <label
                      htmlFor="faq-search"
                      className="flex min-h-[68px] items-center gap-2 rounded-[24px] border border-sky-200 bg-white px-3 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.25)] transition focus-within:border-sky-300 focus-within:ring-4 focus-within:ring-sky-100 sm:gap-3 sm:px-4"
                    >
                      <div className="rounded-2xl bg-sky-50 p-2.5 text-sky-700 sm:p-3">
                        <Search className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="hidden text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:block">
                          Search FAQ answers
                        </p>
                        <input
                          id="faq-search"
                          value={query}
                          onChange={(event) => updateQuery(event.target.value)}
                          placeholder={isMobilePlaceholder ? "Try \"quote timing\"" : "Try \"how soon can I expect quotations?\""}
                          className="w-full min-w-0 border-0 bg-transparent p-0 text-[0.8rem] font-semibold text-slate-950 outline-none placeholder:text-[0.8rem] placeholder:font-normal placeholder:text-slate-400 sm:mt-1 sm:text-base sm:placeholder:text-base"
                        />
                      </div>
                    </label>

                    <div className="mt-4 rounded-[26px] border border-slate-200 bg-white/90 p-3 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.3)]">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm leading-6 text-slate-600">
                          {deferredQuery
                            ? `${filteredFaqs.length} result${filteredFaqs.length === 1 ? "" : "s"} for "${query.trim()}"`
                            : "Top matches appear here instantly so people can jump straight into the right answer."}
                        </p>
                        {query ? (
                          <button
                            type="button"
                            onClick={() => setQuery("")}
                            className="inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
                          >
                            Clear search
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-3 grid gap-3">
                        {searchPreviewItems.length > 0 ? (
                          searchPreviewItems.map((item, index) => {
                            const isActive = activeItem?.id === item.id;

                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setOpenId(item.id);
                                  setSearchHistory((current) => [item.id, ...current.filter((historyId) => historyId !== item.id)].slice(0, 6));
                                }}
                                className={`rounded-[22px] border px-4 py-4 text-left transition ${
                                  isActive
                                    ? "border-sky-200 bg-sky-50/80 shadow-sm"
                                    : "border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] hover:border-slate-300 hover:bg-white"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                      {deferredQuery ? `Match 0${index + 1}` : `Popular 0${index + 1}`}
                                    </p>
                                    <p className="mt-2 text-base font-bold leading-6 text-slate-950 sm:text-lg">{item.question}</p>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">{item.blurb}</p>
                                  </div>
                                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="rounded-[22px] border border-dashed border-slate-300 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] px-5 py-6 text-center">
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">No direct matches</p>
                            <p className="mt-3 text-sm leading-7 text-slate-600">
                              Try a broader term like &quot;cost&quot;, &quot;areas&quot;, &quot;secure&quot;, or &quot;quotes&quot;.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
                    <div className="w-fit rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-950">Free to use</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">No customer fees to request quotes.</p>
                  </div>
                  <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
                    <div className="w-fit rounded-2xl bg-sky-50 p-3 text-sky-700">
                      <MapPinned className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-950">NZ-wide network</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">Local and long-distance movers.</p>
                  </div>
                  <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
                    <div className="w-fit rounded-2xl bg-orange-50 p-3 text-orange-600">
                      <Clock3 className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-950">Fast responses</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">Most quotes arrive within 24 hours.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 bg-[linear-gradient(180deg,#eef5fb_0%,#f8fbfd_28%,#ffffff_100%)] pb-14 pt-8 sm:pb-16 sm:pt-10 lg:-mt-20 lg:pb-20">
        <div className="container-shell">
          {activeItem ? (
            <div className="overflow-hidden rounded-[32px] border border-slate-200/90 bg-white/95 shadow-[0_28px_80px_-52px_rgba(15,23,42,0.35)]">
              <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f4f9ff_100%)] px-5 py-5 sm:px-7 sm:py-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
                  {deferredQuery ? "Quick answer" : "Featured answer"}
                </p>
                <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <h2 className="text-[clamp(2rem,5vw,3.6rem)] font-black leading-[0.95] tracking-[-0.05em] text-slate-950">
                      {activeItem.question}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">{activeItem.blurb}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                    {deferredQuery ? "Updated from search" : "Open a popular question"}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 px-5 py-6 sm:px-7 sm:py-7 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start">
                <div>
                  <p className="max-w-4xl text-sm leading-7 text-slate-600 sm:text-base">{activeItem.answer}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {followUpItems.map(({ item, label }) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setQuery(item.question);
                          setOpenId(item.id);
                          setExpandedHistoryId(null);
                          setSearchHistory((current) =>
                            [item.id, ...current.filter((historyId) => historyId !== item.id)].slice(0, 6)
                          );
                        }}
                        className="inline-flex items-center rounded-full border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 transition hover:border-sky-200 hover:bg-sky-100"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[26px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] p-5">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Need next steps?</p>
                  <p className="mt-3 text-xl font-black leading-tight tracking-[-0.03em] text-slate-950">
                    Start your quote request or contact the team directly.
                  </p>
                  <div className="mt-5 flex flex-col gap-3">
                    <Link
                      href="/"
                      className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#16a34a,#22c55e)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(34,197,94,0.85)] transition hover:translate-y-[-1px]"
                    >
                      Get quotes now
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/contact"
                      className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Contact Match &apos;n Move
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Top searches</p>
                  <h2 className="mt-3 text-[clamp(2.2rem,5vw,4rem)] font-black leading-[0.95] tracking-[-0.05em] text-slate-950">
                    Popular questions, laid out to explore fast.
                  </h2>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
                  Tap a card to load the answer instantly
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {featuredFaqs.map((item, index) => (
                  <button key={item.id} type="button" onClick={() => handleQuickSearch(item)} className="group text-left">
                    <article className="relative flex h-full min-h-[320px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(145deg,#ffffff_0%,#f5f9ff_100%)] p-5 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.28)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_70px_-44px_rgba(15,23,42,0.34)] sm:p-6">
                      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#38bdf8,#22c55e,#f97316)] opacity-90" />
                      <div className="flex items-start justify-between gap-4">
                        <span className="inline-flex rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Top search 0{index + 1}
                        </span>
                        <ArrowRight className="h-5 w-5 text-slate-300 transition duration-300 group-hover:translate-x-1 group-hover:text-slate-700" />
                      </div>
                      <h3 className="mt-5 max-w-full break-words text-[clamp(1.2rem,2.4vw,1.85rem)] font-black leading-[1.05] tracking-[-0.035em] text-slate-950">
                        {item.question}
                      </h3>
                      <p className="mt-4 text-sm leading-7 text-slate-600">{item.blurb}</p>

                      <div
                        className={`mt-5 overflow-hidden rounded-[22px] border transition-all duration-500 ${
                          expandedFeaturedId === item.id
                            ? "max-h-72 border-slate-200 bg-slate-950 text-white shadow-[0_18px_44px_-30px_rgba(15,23,42,0.55)]"
                            : "max-h-0 border-transparent bg-transparent text-transparent"
                        }`}
                      >
                        <div className="faq-reveal-scroll max-h-72 overflow-y-auto px-4 py-4 pr-3">
                          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-sky-200">Quick reveal</p>
                          <p className="mt-3 text-sm leading-7 text-slate-200">{item.answer}</p>
                        </div>
                      </div>

                      <div className="mt-auto pt-5">
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/85 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                          {expandedFeaturedId === item.id ? "Tap again to collapse" : "Tap to reveal answer"}
                        </span>
                      </div>
                    </article>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(145deg,#0f172a,#183552)] p-6 text-white shadow-[0_28px_74px_-44px_rgba(15,23,42,0.75)] sm:p-7">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">Helpful tips</p>
                <h2 className="mt-3 text-[clamp(2rem,5vw,3rem)] font-black leading-[0.95] tracking-[-0.05em] text-white">
                  A smoother quote request starts with better detail.
                </h2>

                <div className="mt-6 space-y-3">
                  {helpfulTips.map((tip, index) => (
                    <article key={tip.title} className="rounded-[24px] border border-white/10 bg-white/[0.06] px-4 py-4">
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Tip 0{index + 1}</p>
                      <p className="mt-2 text-base font-semibold text-white">{tip.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{tip.copy}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f7fbff_100%)] p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.32)] sm:p-7">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Still need help?</p>
                <h2 className="mt-3 text-[clamp(1.9rem,4vw,2.8rem)] font-black leading-[0.98] tracking-[-0.04em] text-slate-950">
                  Start the process or talk with the team directly.
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                  If you&apos;re ready to receive moving quotations from trusted removal companies, begin with the easy
                  steps. If you&apos;re exploring partnership opportunities or need extra help, contact Match &apos;n Move
                  directly.
                </p>

                <div className="mt-6 flex flex-col gap-3">
                  <Link
                    href="/"
                    className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#16a34a,#22c55e)] px-6 py-3 text-base font-semibold text-white shadow-[0_18px_40px_-24px_rgba(34,197,94,0.85)] transition hover:translate-y-[-1px] hover:shadow-[0_24px_48px_-24px_rgba(34,197,94,1)]"
                  >
                    Get quotes now
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Contact Match &apos;n Move
                  </Link>
                </div>

                <div className="mt-6 rounded-[24px] border border-slate-200 bg-white px-4 py-4">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Support email</p>
                  <p className="mt-2 break-all text-lg font-semibold text-slate-950">{SITE_EMAILS.feedback}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Best for feedback, follow-ups, and quote delays beyond 24 to 48 hours.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-[32px] border border-slate-200 bg-white/95 p-5 shadow-[0_28px_80px_-52px_rgba(15,23,42,0.35)] sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">FAQ search history</p>
                <h2 className="mt-3 text-[clamp(2rem,5vw,3.4rem)] font-black leading-[0.95] tracking-[-0.05em] text-slate-950">
                  Recent topics you looked up.
                </h2>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                {historyItems.length} item{historyItems.length === 1 ? "" : "s"} saved
              </div>
            </div>

            <div className="mt-7 space-y-4">
              {historyItems.length > 0 ? (
                historyItems.map((item, index) => {
                  const isExpanded = expandedHistoryId === item.id;

                  return (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]"
                  >
                    <div className="flex items-start justify-between gap-4 px-5 py-5 sm:px-6">
                      <div>
                        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Recent search 0{index + 1}
                        </p>
                        <p className="mt-2 text-lg font-bold leading-7 text-slate-950 sm:text-[1.35rem]">{item.question}</p>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{item.blurb}</p>
                      </div>
                      <button
                        type="button"
                        aria-label={isExpanded ? `Collapse ${item.question}` : `Show full answer for ${item.question}`}
                        onClick={() => {
                          setExpandedHistoryId(isExpanded ? null : item.id);
                          setOpenId(item.id);
                          setQuery(item.question);
                        }}
                        className="mt-1 inline-flex shrink-0 rounded-2xl border border-slate-200 bg-white p-2 text-slate-500 transition duration-300 hover:border-slate-300 hover:text-slate-800"
                      >
                        <ChevronDown className={`h-5 w-5 transition duration-300 ${isExpanded ? "rotate-0" : "-rotate-90"}`} />
                      </button>
                    </div>

                    {isExpanded ? (
                      <div className="border-t border-slate-200 bg-white/70 px-5 py-5 sm:px-6">
                        <p className="max-w-4xl text-sm leading-7 text-slate-600 sm:text-base">{item.answer}</p>
                      </div>
                    ) : null}
                  </article>
                );
                })
              ) : (
                <div className="rounded-[30px] border border-dashed border-slate-300 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] p-8 text-center">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">No history yet</p>
                  <h3 className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950">Search a question and it will appear here.</h3>
                  <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                    Once someone searches in the FAQ bar or opens a suggested result, we keep that topic here for easy revisiting later on the page.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
