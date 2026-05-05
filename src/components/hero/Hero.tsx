import Link from "next/link";
import { RiveHeroAnimation } from "@/src/components/hero/RiveHeroAnimation";

export function Hero() {
  return (
    <section className="relative -mb-px h-[calc(100svh-55px)] min-h-[560px] overflow-hidden bg-white md:min-h-0 md:h-auto xl:h-[calc(100dvh-82px)] xl:min-h-[640px]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-10 h-40 w-40 rounded-full bg-blue-100/70 blur-[90px] sm:h-56 sm:w-56" />
        <div className="absolute right-[6%] top-24 h-48 w-48 rounded-full bg-sky-100/55 blur-[120px] sm:h-72 sm:w-72" />
        <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(180deg,rgba(241,245,249,0.55),transparent)]" />
      </div>

      <div className="mx-auto flex h-full max-w-[1280px] items-start px-4 pb-[148px] pt-6 sm:px-6 sm:pb-[168px] sm:pt-8 md:h-auto md:pb-10 lg:items-center lg:pb-12 xl:h-full xl:pb-[clamp(10rem,26vh,17rem)] xl:pt-[clamp(2.75rem,6vh,5rem)]">
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

          <div className="mt-8 flex flex-col gap-4 sm:mt-10 sm:flex-row sm:items-center sm:gap-5">
            <Link
              href="/quote"
              className="inline-flex min-w-[214px] self-start items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#5468ee,#6171f3)] px-6 py-3 text-[0.98rem] font-semibold text-white shadow-[0_14px_30px_-20px_rgba(79,100,235,0.42)] transition duration-200 hover:bg-blue-700 hover:shadow-[0_16px_34px_-20px_rgba(79,100,235,0.5)] active:translate-y-px sm:min-w-0 sm:rounded-2xl sm:px-8 sm:py-4 sm:text-lg"
            >
              Get Free Quotes
            </Link>
            <p className="max-w-[250px] text-[0.95rem] leading-7 text-slate-400 sm:max-w-[270px] sm:text-base">
              Compare quotes from local movers with no obligation.
            </p>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 -bottom-px z-10 md:relative md:mt-4 md:bottom-auto xl:absolute xl:inset-x-0 xl:-bottom-px xl:mt-0">
        <RiveHeroAnimation />
      </div>
    </section>
  );
}
