const routeSteps = [
  "left-[12%] top-[66%]",
  "left-[25%] top-[61%]",
  "left-[38%] top-[56%]",
  "left-[51%] top-[52%]",
  "left-[64%] top-[48%]",
  "left-[77%] top-[44%]",
];

const quoteCards = [
  {
    position: "right-[8%] top-[19%] h-[32%] w-[42%]",
    rows: ["w-[66%] bg-brandBlue/16", "w-[48%] bg-emerald-300/22", "w-[58%] bg-slate-300/18"],
  },
  {
    position: "right-[18%] top-[42%] h-[29%] w-[46%]",
    rows: ["w-[56%] bg-emerald-300/18", "w-[72%] bg-brandBlue/13", "w-[42%] bg-accentOrange/12"],
  },
  {
    position: "right-[3%] top-[52%] h-[24%] w-[34%]",
    rows: ["w-[62%] bg-brandBlue/12", "w-[46%] bg-slate-300/18"],
  },
];

export function HeroStaticScene() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div className="hero-static-glow absolute right-[-10%] top-[13%] hidden h-[32rem] w-[44rem] rounded-full bg-[radial-gradient(circle_at_48%_42%,rgba(95,110,232,0.105),rgba(125,201,184,0.08)_44%,rgba(255,255,255,0)_72%)] md:block" />

      <div className="absolute right-[-5rem] top-[16%] hidden h-[68%] w-[68%] max-w-[860px] opacity-45 md:block lg:right-[-1rem] lg:w-[52%] lg:opacity-100 xl:right-8 xl:w-[56%]">
        <div className="absolute inset-0 rounded-[42%] bg-[radial-gradient(circle_at_62%_36%,rgba(95,110,232,0.055),rgba(125,201,184,0.05)_44%,transparent_72%)]" />

        <div className="absolute bottom-[4%] right-[5%] h-[37%] w-[88%] rounded-t-[52%] bg-[linear-gradient(140deg,rgba(219,234,254,0.34),rgba(255,255,255,0.08)_62%)]" />
        <div className="absolute bottom-[3%] right-[-1%] h-[42%] w-[72%] rounded-t-[58%] bg-[linear-gradient(145deg,rgba(187,247,208,0.34),rgba(255,255,255,0.08)_68%)]" />

        <div className="absolute left-[10%] top-[65%] h-px w-[68%] -rotate-[15deg] bg-[linear-gradient(90deg,rgba(95,110,232,0),rgba(95,110,232,0.17),rgba(34,197,94,0.16),rgba(95,110,232,0))]" />
        {routeSteps.map((position, index) => (
          <span
            key={position}
            className={`absolute ${position} rounded-full ${
              index === 0 || index === routeSteps.length - 1
                ? "h-4 w-4 border border-brandBlue/20 bg-white/32 shadow-[0_12px_42px_-24px_rgba(95,110,232,0.8)]"
                : "h-2.5 w-2.5 bg-emerald-300/28"
            }`}
          />
        ))}

        <div className="absolute left-[7%] top-[26%] h-[46%] w-[34%] rounded-[34px] border border-white/35 bg-white/16 shadow-[0_26px_90px_-68px_rgba(15,23,42,0.5)]">
          <div className="absolute left-[13%] top-[14%] flex items-center gap-2">
            <span className="h-7 w-7 rounded-full bg-brandBlue/12" />
            <span className="h-2.5 w-20 rounded-full bg-slate-300/22" />
          </div>
          <div className="absolute left-[13%] right-[13%] top-[34%] space-y-3">
            <span className="block h-3 rounded-full bg-brandBlue/16" />
            <span className="block h-3 w-[68%] rounded-full bg-emerald-300/22" />
            <span className="block h-3 w-[82%] rounded-full bg-slate-300/18" />
          </div>
          <div className="absolute bottom-[14%] left-[13%] h-9 w-[46%] rounded-2xl bg-[linear-gradient(135deg,rgba(95,110,232,0.16),rgba(95,110,232,0.08))]" />
        </div>

        {quoteCards.map((card, cardIndex) => (
          <div
            key={card.position}
            className={`absolute ${card.position} rounded-[28px] border border-white/35 bg-white/15 shadow-[0_24px_80px_-68px_rgba(15,23,42,0.46)]`}
          >
            <div className="absolute left-[12%] top-[15%] flex items-center gap-2">
              <span
                className={`h-6 w-6 rounded-full ${
                  cardIndex === 1 ? "bg-emerald-300/16" : "bg-brandBlue/12"
                }`}
              />
              <span className="h-2.5 w-16 rounded-full bg-slate-300/20" />
            </div>
            <div className="absolute left-[12%] right-[12%] top-[38%] space-y-2.5">
              {card.rows.map((row) => (
                <span key={row} className={`block h-2.5 rounded-full ${row}`} />
              ))}
            </div>
          </div>
        ))}

        <div className="absolute right-[4%] top-[12%] grid grid-cols-4 gap-3 opacity-55">
          {Array.from({ length: 16 }, (_, index) => (
            <span key={index} className="h-1.5 w-1.5 rounded-full bg-brandBlue/28" />
          ))}
        </div>

        <div className="absolute bottom-[13%] right-[12%] flex items-end gap-2 opacity-70">
          <span className="h-10 w-2 rounded-full bg-brandBlue/10" />
          <span className="h-16 w-2 rounded-full bg-emerald-300/20" />
          <span className="h-12 w-2 rounded-full bg-accentOrange/12" />
          <span className="h-20 w-2 rounded-full bg-emerald-300/18" />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-[26%] bg-[radial-gradient(ellipse_at_80%_100%,rgba(187,247,208,0.18),transparent_58%),radial-gradient(ellipse_at_28%_100%,rgba(219,234,254,0.2),transparent_55%)] md:hidden" />
    </div>
  );
}
