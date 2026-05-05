"use client";

import Link from "next/link";
import { ShieldCheck, Sparkles, WalletCards, type LucideIcon } from "lucide-react";
import { motion, useInView, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion";
import { useRef, useState } from "react";

const steps = [
  { number: "1", title: "Tell Us About Your Move" },
  { number: "2", title: "Compare Quotes" },
  { number: "3", title: "Choose & Save" },
] as const;

const benefits = [
  {
    title: "Trusted movers",
    description: "Vetted moving companies with profiles you can compare in one place.",
    icon: ShieldCheck,
    accent: "from-emerald-300/24 via-emerald-400/10 to-transparent",
    iconColor: "text-emerald-200",
    pill: "Verified partners",
    href: "/movers",
    cta: "View trusted movers",
  },
  {
    title: "Quick and easy",
    description: "Send one request and start receiving quotes without the back-and-forth.",
    icon: Sparkles,
    accent: "from-sky-300/24 via-blue-400/10 to-transparent",
    iconColor: "text-sky-200",
    pill: "Fast responses",
    href: "/quote",
    cta: "Get quotes",
  },
  {
    title: "No obligation",
    description: "Browse your options freely and choose only when the price feels right.",
    icon: WalletCards,
    accent: "from-amber-300/24 via-accentOrange/10 to-transparent",
    iconColor: "text-orange-200",
    pill: "100% free to compare",
  },
] as const;

function getStepState(progress: number, index: number, total: number) {
  const segment = 1 / total;
  const start = index * segment;
  const end = start + segment;
  const center = start + segment / 2;

  if (progress >= end) {
    return "complete" as const;
  }

  const distanceFromCenter = Math.abs(progress - center);
  const activationWindow = segment * 0.55;

  if (distanceFromCenter <= activationWindow) {
    return "active" as const;
  }

  return "upcoming" as const;
}

function StepCard({
  number,
  title,
  state,
}: {
  number: string;
  title: string;
  state: "active" | "complete" | "upcoming";
}) {
  const stateClasses = {
    active: {
      card: "border-white/20 bg-white/[0.12] shadow-[0_24px_70px_-30px_rgba(222,122,58,0.85)]",
      ring: "border-white/35 bg-white/[0.06] text-white",
      title: "text-white",
      number: "text-white",
      scale: 1.03,
      opacity: 1,
      y: -2,
    },
    complete: {
      card: "border-white/12 bg-white/[0.08]",
      ring: "border-white/15 bg-white/[0.04] text-white/90",
      title: "text-slate-100",
      number: "text-white/85",
      scale: 0.99,
      opacity: 0.8,
      y: 0,
    },
    upcoming: {
      card: "border-white/10 bg-white/[0.04]",
      ring: "border-white/10 bg-white/[0.04] text-slate-400",
      title: "text-slate-400",
      number: "text-slate-500",
      scale: 0.96,
      opacity: 0.58,
      y: 6,
    },
  }[state];

  return (
    <motion.article
      animate={{ scale: stateClasses.scale, opacity: stateClasses.opacity, y: stateClasses.y }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-[28px] border px-5 py-5 backdrop-blur-xl md:px-6 md:py-6 ${stateClasses.card}`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-base font-semibold md:h-12 md:w-12 ${stateClasses.ring}`}
        >
          {number}
        </div>
        <h3 className={`text-lg font-semibold tracking-[-0.02em] md:text-[1.35rem] ${stateClasses.title}`}>{title}</h3>
      </div>
    </motion.article>
  );
}

function BenefitCard({
  title,
  description,
  icon: Icon,
  accent,
  iconColor,
  pill,
  href,
  cta,
  index,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  iconColor: string;
  pill: string;
  href?: string;
  cta?: string;
  index: number;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(cardRef, { once: true, margin: "-15% 0px -10% 0px" });
  const isInteractive = Boolean(href);
  const cardClassName = `group relative h-full overflow-hidden rounded-[28px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] px-5 py-5 backdrop-blur-xl sm:px-6 sm:py-6 ${
    isInteractive
      ? "cursor-pointer border-white/12 transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#091423]"
      : "border-white/12"
  }`;

  const cardBody = (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),transparent_42%,rgba(255,255,255,0.03))] opacity-90 transition duration-500 group-hover:opacity-100" />
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-br ${accent} opacity-90 blur-2xl`} />
      <div className="pointer-events-none absolute -right-12 bottom-0 h-24 w-24 rounded-full bg-white/5 blur-3xl" />
      <div className="relative flex min-h-[180px] flex-col justify-between sm:min-h-[220px]">
        <div className="flex items-start justify-between gap-4">
          <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.08] shadow-[0_12px_30px_-18px_rgba(15,23,42,0.9)] ${iconColor}`}>
            <Icon className="h-7 w-7" strokeWidth={2.1} />
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/65">
            {pill}
          </span>
        </div>

        <div className="mt-10 sm:mt-12">
          <h3 className="max-w-[11ch] text-[1.9rem] font-semibold leading-[0.96] tracking-[-0.04em] text-white sm:text-[2.2rem]">
            {title}
          </h3>
          <p className="mt-3 max-w-[26ch] text-sm leading-6 text-slate-300 sm:text-[0.98rem]">
            {description}
          </p>
          {cta ? (
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white/90">
              <span>{cta}</span>
              <span aria-hidden="true" className="text-base transition duration-300 group-hover:translate-x-1">
                &rarr;
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 26, scale: 0.98 }}
        animate={isInView ? { opacity: 1, y: 0, scale: 1 } : undefined}
        transition={{ duration: 0.65, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ y: -6, scale: 1.018 }}
        className="h-full"
      >
        <Link href={href} className={`${cardClassName} flex w-full`}>
          {cardBody}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 26, scale: 0.98 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : undefined}
      transition={{ duration: 0.65, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, scale: 1.01 }}
      className="h-full"
    >
      <article className={cardClassName}>{cardBody}</article>
    </motion.div>
  );
}

export function ScrollJourneySection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [stepStates, setStepStates] = useState<Array<"active" | "complete" | "upcoming">>(
    steps.map((_, index) => getStepState(0, index, steps.length)),
  );
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 80%", "end 80%"],
  });

  const { scrollYProgress: timelineProgress } = useScroll({
    target: timelineRef,
    offset: ["start 62%", "end 58%"],
  });

  const easedProgress = useSpring(timelineProgress, { stiffness: 130, damping: 28, mass: 0.2 });
  const progressHeight = useTransform(easedProgress, [0, 1], ["0%", "100%"]);
  const headerOpacity = useTransform(scrollYProgress, [0, 0.16, 0.28], [0.42, 0.72, 1]);
  const headerY = useTransform(scrollYProgress, [0, 0.28], [18, 0]);
  const sectionGlow = useTransform(scrollYProgress, [0, 1], [0.28, 0.6]);

  useMotionValueEvent(easedProgress, "change", (latest) => {
    setStepStates(steps.map((_, index) => getStepState(latest, index, steps.length)));
  });

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.26),transparent_28%),radial-gradient(circle_at_85%_18%,rgba(56,189,248,0.16),transparent_24%),linear-gradient(180deg,#06111f_0%,#081425_28%,#091524_58%,#07111d_100%)] text-white"
    >
      <motion.div
        style={{ opacity: sectionGlow }}
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_30%_30%,rgba(96,165,250,0.24),transparent_38%),radial-gradient(circle_at_70%_10%,rgba(59,130,246,0.14),transparent_28%)] blur-3xl"
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(148,163,184,0.035),transparent)]" />
      <div className="pointer-events-none absolute left-[12%] top-28 h-44 w-44 rounded-full bg-blue-400/10 blur-[120px]" />
      <div className="pointer-events-none absolute right-[10%] top-1/3 h-56 w-56 rounded-full bg-cyan-300/10 blur-[140px]" />

      <div className="relative mx-auto max-w-[1240px] px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
        <div ref={timelineRef} className="grid gap-16 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-12">
          <motion.div style={{ opacity: headerOpacity, y: headerY }} className="lg:sticky lg:top-28 lg:self-start">
            <div className="max-w-[28rem]">
              <p className="text-sm font-semibold uppercase tracking-[0.26em] text-blue-200/75">Steps</p>
              <h2 className="mt-5 max-w-[11ch] text-[clamp(2.15rem,8vw,4.75rem)] font-black leading-[0.92] tracking-[-0.05em] text-white sm:max-w-none">
                Scroll through the moving journey.
              </h2>
            </div>
          </motion.div>

          <div className="relative">
            <div className="absolute left-[22px] top-2 bottom-2 w-px bg-gradient-to-b from-white/5 via-white/10 to-white/5 md:left-7" />
            <motion.div
              style={{ height: progressHeight }}
              className="absolute left-[21px] top-2 w-[3px] origin-top rounded-full bg-[linear-gradient(180deg,rgba(255,210,182,0.35),rgba(222,122,58,0.95),rgba(255,190,144,0.45))] shadow-[0_0_28px_rgba(222,122,58,0.55)] md:left-[26px]"
            />

            <div className="space-y-6 md:space-y-7">
              {steps.map((step, index) => (
                <div key={step.number} className="relative pl-14 md:pl-20">
                  <div className="absolute left-[14px] top-6 h-4 w-4 rounded-full border border-blue-200/35 bg-slate-950 md:left-[19px]" />
                  <div
                    className={`absolute left-[12px] top-[22px] h-8 w-8 rounded-full blur-xl md:left-[17px] ${
                      stepStates[index] === "active" ? "bg-[rgba(222,122,58,0.55)]" : "bg-transparent"
                    }`}
                  />
                  <StepCard number={step.number} title={step.title} state={stepStates[index]} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-20 border-t border-white/8 pt-16 sm:mt-28 sm:pt-24">
          <div className="max-w-[40rem]">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-blue-200/75">Benefits</p>
            <h2 className="mt-5 text-[clamp(2.05rem,7.6vw,4rem)] font-black leading-[0.94] tracking-[-0.05em] text-white">
              Why choose us?
            </h2>
          </div>

          <div className="mt-10 grid gap-4 sm:mt-12 sm:gap-5 md:grid-cols-3">
            {benefits.map((benefit, index) => (
              <BenefitCard key={benefit.title} index={index} {...benefit} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
