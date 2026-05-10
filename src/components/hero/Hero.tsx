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

      <div className="mx-auto flex max-w-[1280px] flex-col items-start px-4 pb-[150px] pt-10 text-left sm:px-6 sm:pb-[170px] sm:pt-12 md:pb-[190px] lg:pb-[190px] xl:min-h-[calc(100dvh-82px)] xl:justify-start xl:pb-[clamp(13rem,28vh,18rem)] xl:pt-[clamp(2rem,5vh,3.5rem)]">
        <div className="relative flex w-full max-w-[900px] flex-col items-start opacity-100 transition duration-700 ease-out">
          <h1 className="max-w-[11.5ch] text-[clamp(2.25rem,8.4vw,4.7rem)] font-black leading-[1.02] tracking-[-0.04em] text-slate-950 sm:max-w-[12.5ch] lg:max-w-[13ch]">
            Compare trusted{" "}
            <span className="bg-[linear-gradient(135deg,#3b82f6,#5b6ef5)] bg-clip-text text-transparent">
              moving quotes
            </span>{" "}
            in minutes.
          </h1>
        </div>

        <div className="relative z-20 mt-6 w-full max-w-[720px] sm:mt-7">
          <HeroQuoteCard />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 -bottom-px z-10 md:relative md:mt-4 md:bottom-auto xl:absolute xl:inset-x-0 xl:bottom-[clamp(1.5rem,4vh,3rem)] xl:mt-0">
        <RiveHeroAnimation />
      </div>
    </section>
  );
}
