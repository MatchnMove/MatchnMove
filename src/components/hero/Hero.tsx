import { HeroQuoteCard } from "@/src/components/hero/HeroQuoteCard";
import { RiveHeroAnimation } from "@/src/components/hero/RiveHeroAnimation";

export function Hero() {
  return (
    <section className="relative -mb-px overflow-hidden bg-white">
      <div className="relative overflow-hidden bg-white">
        <div className="relative z-20 mx-auto flex min-h-[calc(100svh-61px)] max-w-[1280px] flex-col items-start px-4 pb-8 pt-8 text-left sm:min-h-[calc(100svh-73px)] sm:px-6 sm:pb-10 sm:pt-10 lg:min-h-[calc(100svh-81px)] xl:pt-[clamp(1.5rem,3.5vh,2.75rem)]">
          <div className="relative flex w-full max-w-[900px] flex-col items-start opacity-100 transition duration-700 ease-out">
            <h1 className="max-w-[11.5ch] text-[clamp(2.25rem,8.1vw,4.55rem)] font-black leading-[1.02] tracking-[-0.04em] text-slate-950 sm:max-w-[12.5ch] lg:max-w-[13ch]">
              Compare trusted{" "}
              <span className="bg-[linear-gradient(135deg,#3b82f6,#5b6ef5)] bg-clip-text text-transparent">
                moving quotes
              </span>{" "}
              in minutes.
            </h1>
          </div>

          <div className="relative z-20 mt-5 w-full max-w-[660px] sm:mt-6">
            <HeroQuoteCard />
          </div>
        </div>
      </div>

      <div className="pointer-events-none relative z-10 -mb-px">
        <RiveHeroAnimation />
      </div>
    </section>
  );
}
