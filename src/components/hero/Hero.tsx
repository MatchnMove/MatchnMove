import { HeroQuoteCard } from "@/src/components/hero/HeroQuoteCard";
import { RiveHeroAnimation } from "@/src/components/hero/RiveHeroAnimation";

export function Hero() {
  return (
    <section className="relative -mb-px min-h-[calc(100svh-55px)] overflow-hidden bg-white xl:min-h-[calc(100dvh-82px)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-10 h-40 w-40 rounded-full bg-blue-100/70 blur-[90px] sm:h-56 sm:w-56" />
        <div className="absolute right-[6%] top-24 h-48 w-48 rounded-full bg-sky-100/55 blur-[120px] sm:h-72 sm:w-72" />
        <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(180deg,rgba(241,245,249,0.55),transparent)]" />
      </div>

      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 pb-[150px] pt-6 sm:px-6 sm:pb-[170px] sm:pt-8 md:pb-[190px] lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,440px)] lg:items-center lg:gap-10 lg:pb-[190px] xl:min-h-[calc(100dvh-82px)] xl:pb-[clamp(10rem,24vh,16rem)] xl:pt-[clamp(2.75rem,6vh,5rem)]">
        <div className="relative flex max-w-[760px] flex-col opacity-100 transition duration-700 ease-out">
          <p className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-4 py-2 text-[0.92rem] font-semibold text-blue-600 sm:px-5 sm:py-2.5 sm:text-sm">
            Plan your move with confidence
          </p>

          <h1 className="mt-5 max-w-[10.5ch] text-[clamp(2rem,10vw,4rem)] font-black leading-[1.02] tracking-[-0.04em] text-slate-950 sm:mt-7 sm:max-w-[12.5ch] lg:max-w-[13ch]">
            Compare trusted{" "}
            <span className="bg-[linear-gradient(135deg,#3b82f6,#5b6ef5)] bg-clip-text text-transparent">
              moving quotes
            </span>{" "}
            in minutes.
          </h1>

          <p className="mt-6 max-w-[32rem] text-[0.98rem] leading-[1.75] text-slate-600 sm:mt-7 sm:text-[clamp(1rem,1.55vw,1.125rem)]">
            Tell us about your move once, review transparent options, and choose the best mover for your timeline.
          </p>

          <div className="mt-7 flex flex-wrap gap-3 text-sm font-semibold text-slate-500 sm:mt-8">
            <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-2">Free to compare</span>
            <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-2">Trusted local movers</span>
          </div>
        </div>

        <div className="relative z-20 w-full justify-self-center lg:justify-self-end">
          <HeroQuoteCard />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 -bottom-px z-10 md:relative md:mt-4 md:bottom-auto xl:absolute xl:inset-x-0 xl:-bottom-px xl:mt-0">
        <RiveHeroAnimation />
      </div>
    </section>
  );
}
