import Image from "next/image";
import { CheckCircle2, Sparkles } from "lucide-react";
import { HeroQuoteCard } from "@/src/components/hero/HeroQuoteCard";

export function Hero() {
  return (
    <section className="relative z-20 -mb-px overflow-hidden bg-[#07162b]">
      <div className="relative overflow-hidden sm:min-h-[calc(100svh-73px)] lg:h-[calc(100svh-81px)] lg:min-h-0">
        <Image
          src="/HeroImg.webp"
          alt=""
          fill
          sizes="100vw"
          quality={60}
          priority
          fetchPriority="high"
          className="object-cover object-[62%_center] sm:object-center"
        />

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,24,40,0.64)_0%,rgba(3,24,40,0.76)_52%,rgba(3,24,40,0.9)_100%)] sm:bg-[linear-gradient(90deg,rgba(3,24,40,0.88)_0%,rgba(3,24,40,0.7)_42%,rgba(3,24,40,0.25)_75%,rgba(3,24,40,0.08)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_14%,rgba(247,147,30,0.12),transparent_24%),radial-gradient(circle_at_14%_56%,rgba(18,183,164,0.12),transparent_34%)]" />

        <div className="relative z-20 mx-auto flex max-w-[1280px] flex-col items-start px-4 py-8 text-left sm:min-h-[calc(100svh-73px)] sm:justify-center sm:px-6 sm:py-8 lg:h-full lg:min-h-0 lg:py-6">
          <div className="relative flex w-full max-w-[640px] flex-col items-start lg:max-w-[690px]">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-md sm:mb-4 sm:text-xs">
              <Sparkles className="h-3.5 w-3.5 text-[#ffb347]" />
              Your move, matched
            </div>

            <h1 className="max-w-[12ch] font-sans text-[clamp(2.75rem,13vw,4rem)] font-black leading-[0.95] tracking-[-0.055em] text-white sm:text-[4rem] sm:leading-[0.92] lg:text-[4.5rem] xl:text-[5rem]">
              Moving made{" "}
              <span className="bg-[linear-gradient(105deg,#54e0ca,#ffffff_48%,#ffb347)] bg-clip-text text-transparent">
                easier.
              </span>
            </h1>

            <p className="mt-3 max-w-[31rem] text-[0.95rem] font-medium leading-6 text-slate-200 sm:mt-5 sm:text-[1.08rem] sm:leading-7">
              Compare trusted New Zealand movers in minutes. One simple request, multiple free quotes.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.76rem] font-semibold text-white/90 sm:mt-4 sm:text-sm">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#54e0ca]" />
                Free to compare
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#54e0ca]" />
                No obligation
              </span>
            </div>
          </div>

          <div className="relative z-20 mt-4 w-full max-w-[640px] sm:mt-6">
            <HeroQuoteCard />
          </div>
        </div>
      </div>
    </section>
  );
}
