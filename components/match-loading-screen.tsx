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
        <div className="relative grid size-[150px] place-items-center sm:size-[176px]">
          <div className="match-loader-glow absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.96)_0%,rgba(236,249,250,0.78)_42%,rgba(255,176,43,0.12)_66%,transparent_72%)] blur-[2px]" />
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

function ProgressIndicator() {
  return (
    <div className="mt-12 flex w-full justify-center sm:mt-14" aria-hidden="true">
      <div className="match-loader-track">
        <span className="match-loader-dot" />
      </div>
    </div>
  );
}
