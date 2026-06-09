import Image from "next/image";
import { HeroQuoteCard } from "@/src/components/hero/HeroQuoteCard";

export function Hero() {
  return (
    <section className="relative -mb-px overflow-hidden bg-white">
      <div className="relative min-h-[calc(100svh-61px)] overflow-hidden bg-slate-100 sm:min-h-[calc(100svh-73px)] lg:h-[calc(100svh-81px)] lg:min-h-0">
        <Image
          src="/HeroImg.webp"
          alt=""
          fill
          sizes="100vw"
          quality={60}
          priority
          fetchPriority="high"
          className="object-cover object-[58%_center] sm:object-center"
        />

        <div className="absolute inset-0 bg-[linear-gradient(90deg,#ffffff_0%,rgba(255,255,255,0.97)_21%,rgba(255,255,255,0.76)_44%,rgba(255,255,255,0.24)_70%,rgba(255,255,255,0.05)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.22)_0%,transparent_38%,rgba(255,255,255,0.14)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_46%,rgba(255,255,255,0.88)_0%,rgba(255,255,255,0.62)_28%,transparent_50%)] lg:bg-none" />

        <div className="relative z-20 mx-auto flex min-h-[calc(100svh-61px)] max-w-[1280px] flex-col items-start justify-center px-4 py-6 text-left sm:min-h-[calc(100svh-73px)] sm:px-6 sm:py-8 lg:h-full lg:min-h-0 lg:justify-center lg:py-6">
          <div className="relative flex w-full max-w-[680px] flex-col items-start opacity-100 transition duration-700 ease-out lg:max-w-[720px]">
            <h1 className="max-w-[15ch] text-[2.7rem] font-black leading-[1] tracking-normal text-slate-950 drop-shadow-[0_2px_0_rgba(255,255,255,0.65)] sm:text-[3.95rem] lg:text-[4.25rem] xl:text-[4.85rem]">
              Compare trusted{" "}
              <span className="bg-[linear-gradient(135deg,#2f73ff,#5b6ef5)] bg-clip-text text-transparent">
                moving quotes
              </span>{" "}
              in minutes.
            </h1>

            <p className="mt-4 max-w-[34rem] text-[0.98rem] leading-7 text-slate-700 sm:mt-5 sm:text-[1.05rem]">
              Tell us about your move once, review transparent options, and choose the best mover for your timeline.
            </p>
          </div>

          <div className="relative z-20 mt-5 w-full max-w-[660px] sm:mt-6">
            <HeroQuoteCard />
          </div>
        </div>

      </div>
    </section>
  );
}
