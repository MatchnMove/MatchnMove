import Image from "next/image";

type MatchLoadingScreenProps = {
  className?: string;
};

export function MatchLoadingScreen({ className = "" }: MatchLoadingScreenProps) {
  return (
    <div
      className={`match-loader-screen fixed inset-0 z-[9999] grid min-h-svh place-items-center overflow-hidden bg-[linear-gradient(135deg,#fff9ef_0%,#f8fbfc_44%,#eaf8fb_100%)] px-5 py-10 text-center text-[#071d3c] ${className}`}
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <BackgroundTexture />

      <section className="relative z-10 flex w-full max-w-[620px] flex-col items-center">
        <div className="relative grid size-[176px] place-items-center sm:size-[214px]">
          <div className="match-loader-glow absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.96)_0%,rgba(236,249,250,0.78)_42%,rgba(255,176,43,0.12)_66%,transparent_72%)] blur-[2px]" />
          <OrbitRing className="absolute inset-0 text-[#14b8a6]/55" direction="normal" />
          <OrbitRing className="absolute inset-[18px] text-[#f59e0b]/45" direction="reverse" />
          <div className="match-loader-logo-shell relative grid size-[86px] place-items-center rounded-[24px] bg-white/80 ring-1 ring-white/80 backdrop-blur-xl sm:size-[104px] sm:rounded-[28px]">
            <Image
              src="/logo-mark.png"
              alt=""
              width={82}
              height={82}
              priority
              className="match-loader-logo size-[62px] object-contain sm:size-[76px]"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center sm:mt-7">
          <p className="text-[0.72rem] font-black uppercase leading-5 tracking-[0.44em] text-teal-700 sm:text-[0.78rem]">
            Match &apos;N Move
          </p>
          <h1 className="mt-4 max-w-[12ch] text-[clamp(2.35rem,6vw,4.35rem)] font-black leading-[0.98] tracking-normal text-[#082653] sm:mt-5 sm:max-w-none">
            Getting your move ready
          </h1>
          <p className="mt-5 max-w-[34rem] text-base leading-7 text-slate-500 sm:text-lg sm:leading-8">
            Finding the clearest path from quote request to moving day.
          </p>
        </div>

        <ProgressIndicator />
      </section>
    </div>
  );
}

function BackgroundTexture() {
  return (
    <>
      <div className="match-loader-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div
        className="pointer-events-none absolute left-[-12%] top-[-20%] h-[42rem] w-[42rem] rounded-full bg-[radial-gradient(circle,rgba(255,176,43,0.16),transparent_64%)] blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-[-24%] right-[-14%] h-[46rem] w-[46rem] rounded-full bg-[radial-gradient(circle,rgba(20,184,166,0.14),transparent_64%)] blur-3xl"
        aria-hidden="true"
      />
      <svg
        className="match-loader-route pointer-events-none absolute left-1/2 top-1/2 h-[min(82vw,760px)] w-[min(82vw,760px)] -translate-x-1/2 -translate-y-1/2 opacity-45"
        viewBox="0 0 720 720"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="360" cy="360" r="318" stroke="white" strokeWidth="1" />
        <path
          d="M108 436C166 478 226 478 286 436C366 380 420 368 482 396C526 416 564 409 612 374"
          stroke="url(#routeGradient)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeDasharray="2 13"
        />
        <defs>
          <linearGradient id="routeGradient" x1="108" x2="612" y1="436" y2="374" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F59E0B" stopOpacity="0" />
            <stop offset="0.48" stopColor="#14B8A6" />
            <stop offset="1" stopColor="#0B315F" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </>
  );
}

function OrbitRing({ className, direction }: { className: string; direction: "normal" | "reverse" }) {
  return (
    <svg
      className={`match-loader-orbit ${direction === "reverse" ? "match-loader-orbit--reverse" : ""} ${className}`}
      viewBox="0 0 220 220"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="110" cy="110" r="95" stroke="currentColor" strokeWidth="1" opacity="0.16" />
      <path d="M41 45A94 94 0 0 1 174 37" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M182 77A94 94 0 0 1 151 193" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="176" cy="38" r="2.8" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

function ProgressIndicator() {
  return (
    <div className="mt-12 w-full max-w-[360px] sm:mt-14" aria-hidden="true">
      <div className="relative h-px overflow-visible rounded-full bg-[linear-gradient(90deg,transparent,rgba(8,38,83,0.16),transparent)]">
        <span className="match-loader-progress absolute left-0 top-1/2 h-px w-[44%] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,transparent,#14b8a6_24%,#2aa8e8_54%,#f59e0b_100%)]" />
        <span className="match-loader-dot absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-cyan-400 shadow-[0_0_0_5px_rgba(34,211,238,0.16),0_0_24px_rgba(20,184,166,0.46)]" />
      </div>
      <div className="mt-4 flex justify-center gap-2">
        <span className="h-1 w-1 rounded-full bg-teal-500/45" />
        <span className="h-1 w-1 rounded-full bg-sky-500/35" />
        <span className="h-1 w-1 rounded-full bg-amber-500/40" />
      </div>
    </div>
  );
}
