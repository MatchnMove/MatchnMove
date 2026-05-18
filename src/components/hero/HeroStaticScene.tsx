const routeDots = [
  "left-[18%] top-[63%]",
  "left-[27%] top-[59%]",
  "left-[36%] top-[55%]",
  "left-[45%] top-[51%]",
  "left-[54%] top-[48%]",
  "left-[63%] top-[45%]",
  "left-[72%] top-[42%]",
];

const quoteRows = [
  "w-24 bg-brandBlue/18",
  "w-32 bg-emerald-300/24",
  "w-20 bg-accentOrange/14",
];

export function HeroStaticScene() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div className="hero-static-glow absolute right-[-8%] top-[14%] hidden h-[30rem] w-[42rem] rounded-full bg-[radial-gradient(circle_at_50%_42%,rgba(95,110,232,0.1),rgba(125,201,184,0.085)_45%,rgba(255,255,255,0)_72%)] md:block" />

      <div className="absolute right-[-5rem] top-[18%] hidden h-[66%] w-[66%] max-w-[850px] opacity-45 md:block lg:right-0 lg:w-[48%] lg:opacity-100 xl:right-10 xl:w-[52%]">
        <div className="absolute inset-0 rounded-[42%] bg-[radial-gradient(circle_at_62%_35%,rgba(95,110,232,0.055),rgba(125,201,184,0.05)_42%,transparent_72%)]" />

        <div className="absolute bottom-[5%] right-[5%] h-[34%] w-[82%] rounded-t-[55%] bg-[linear-gradient(140deg,rgba(219,234,254,0.34),rgba(255,255,255,0.08)_62%)]" />
        <div className="absolute bottom-[4%] right-[0%] h-[40%] w-[68%] rounded-t-[58%] bg-[linear-gradient(145deg,rgba(187,247,208,0.36),rgba(255,255,255,0.08)_68%)]" />

        <div className="absolute left-[36%] top-[20%] h-[48%] w-[42%] rounded-[30px] border border-white/35 bg-white/16 shadow-[0_24px_90px_-70px_rgba(15,23,42,0.45)]">
          <div className="absolute left-[12%] top-[15%] h-3 w-[62%] rounded-full bg-brandBlue/12" />
          <div className="absolute left-[12%] top-[31%] h-3 w-[46%] rounded-full bg-emerald-300/18" />
          <div className="absolute left-[12%] top-[47%] h-3 w-[55%] rounded-full bg-accentOrange/10" />
          <div className="absolute bottom-[16%] left-[12%] h-10 w-10 rounded-2xl bg-brandBlue/10" />
          <div className="absolute bottom-[17%] left-[31%] h-2.5 w-[42%] rounded-full bg-slate-300/18" />
        </div>

        <div className="absolute right-[6%] top-[47%] h-[27%] w-[28%] rounded-[24px] border border-white/30 bg-white/13">
          <div className="absolute left-[15%] top-[20%] h-2.5 w-[55%] rounded-full bg-brandBlue/12" />
          <div className="absolute left-[15%] top-[42%] h-2.5 w-[42%] rounded-full bg-emerald-300/16" />
          <div className="absolute bottom-[18%] left-[15%] h-7 w-7 rounded-xl bg-emerald-300/14" />
        </div>

        <div className="absolute left-[18%] top-[51%] h-24 w-24 rounded-full border border-brandBlue/10 bg-white/8" />
        <div className="hero-static-pin absolute left-[23%] top-[57%] h-10 w-10 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[50%_50%_50%_8%] bg-[linear-gradient(135deg,rgba(95,110,232,0.46),rgba(147,197,253,0.34))]">
          <div className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90" />
        </div>

        <div className="absolute right-[12%] bottom-[15%] h-16 w-12 rounded-full bg-emerald-300/24" />
        <div className="absolute right-[15%] bottom-[9%] h-14 w-1 rounded-full bg-emerald-300/30" />
        <div className="absolute right-[23%] bottom-[14%] h-11 w-9 rounded-full bg-emerald-300/20" />
        <div className="absolute right-[25%] bottom-[9%] h-11 w-1 rounded-full bg-emerald-300/24" />

        <div className="absolute left-[18%] top-[63%] h-px w-[54%] -rotate-[13deg] bg-[linear-gradient(90deg,rgba(95,110,232,0),rgba(95,110,232,0.14),rgba(34,197,94,0.14),rgba(95,110,232,0))]" />
        {routeDots.map((position, index) => (
          <span
            key={position}
            className={`absolute ${position} h-2 w-2 rounded-full ${
              index === 0 || index === routeDots.length - 1 ? "bg-brandBlue/28" : "bg-emerald-300/24"
            }`}
          />
        ))}

        <div className="absolute right-[4%] top-[13%] grid grid-cols-4 gap-3 opacity-55">
          {Array.from({ length: 16 }, (_, index) => (
            <span key={index} className="h-1.5 w-1.5 rounded-full bg-brandBlue/28" />
          ))}
        </div>

        <div className="absolute right-[12%] top-[27%] w-[13.5rem] rounded-[26px] border border-white/45 bg-white/18 p-4 shadow-[0_22px_80px_-64px_rgba(15,23,42,0.5)] backdrop-blur-[1px]">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-7 w-7 rounded-full bg-brandBlue/12" />
            <span className="h-2.5 w-24 rounded-full bg-slate-300/22" />
          </div>
          <div className="space-y-2.5">
            {quoteRows.map((row) => (
              <span key={row} className={`block h-2.5 rounded-full ${row}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-[26%] bg-[radial-gradient(ellipse_at_80%_100%,rgba(187,247,208,0.18),transparent_58%),radial-gradient(ellipse_at_28%_100%,rgba(219,234,254,0.2),transparent_55%)] md:hidden" />
    </div>
  );
}
