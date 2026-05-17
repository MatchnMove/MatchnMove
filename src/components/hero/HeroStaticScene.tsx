const dotPoints = [
  [724, 72],
  [747, 72],
  [770, 72],
  [793, 72],
  [724, 96],
  [747, 96],
  [770, 96],
  [793, 96],
  [724, 120],
  [747, 120],
  [770, 120],
  [793, 120],
  [724, 144],
  [747, 144],
  [770, 144],
  [793, 144],
];

export function HeroStaticScene() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div className="hero-static-glow absolute right-[-14%] top-[12%] hidden h-[34rem] w-[46rem] rounded-full bg-[radial-gradient(circle_at_48%_45%,rgba(95,110,232,0.12),rgba(125,201,184,0.11)_42%,rgba(255,255,255,0)_72%)] md:block lg:right-[-6%]" />

      <svg
        viewBox="0 0 860 560"
        preserveAspectRatio="xMaxYMid meet"
        className="absolute right-[-14rem] top-[22%] hidden h-[68%] w-[82%] opacity-35 md:block lg:right-[-3.5rem] lg:top-[12%] lg:h-[76%] lg:w-[62%] lg:opacity-95 xl:right-10 xl:w-[65%]"
      >
        <defs>
          <linearGradient id="heroSceneHillBlue" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#d9e7ff" stopOpacity="0.52" />
            <stop offset="68%" stopColor="#ecf4ff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="heroSceneHillGreen" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#d9f6e1" stopOpacity="0.54" />
            <stop offset="74%" stopColor="#edfdf3" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="heroScenePin" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#5f6ee8" stopOpacity="0.66" />
            <stop offset="100%" stopColor="#9bb7ff" stopOpacity="0.44" />
          </linearGradient>
          <radialGradient id="heroSceneGroundGlow" cx="56%" cy="50%" r="66%">
            <stop offset="0%" stopColor="#e5fbf1" stopOpacity="0.3" />
            <stop offset="48%" stopColor="#eef6ff" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <filter id="heroScenePinShadow" x="-45%" y="-45%" width="190%" height="190%">
            <feDropShadow dx="0" dy="15" stdDeviation="18" floodColor="#5f6ee8" floodOpacity="0.08" />
          </filter>
        </defs>

        <rect x="80" y="22" width="760" height="515" fill="url(#heroSceneGroundGlow)" opacity="0.68" />

        <g opacity="0.52">
          <image href="/house.svg" x="392" y="190" width="218" height="218" opacity="0.3" />
          <image href="/house.svg" x="632" y="310" width="172" height="172" opacity="0.22" />
        </g>

        <g opacity="0.28">
          <image href="/cloud.svg" x="242" y="262" width="70" height="46" opacity="0.36" />
          <image href="/cloud.svg" x="642" y="168" width="76" height="50" opacity="0.32" />
          <image href="/cloud.svg" x="788" y="280" width="66" height="42" opacity="0.3" />
        </g>

        <g opacity="0.68">
          <path
            d="M0 498 C112 456 240 457 364 482 C480 506 545 405 680 409 C759 412 817 446 860 474 V560 H0 Z"
            fill="url(#heroSceneHillBlue)"
          />
          <path
            d="M242 560 C352 457 471 414 607 412 C715 410 792 456 860 500 V560 H242 Z"
            fill="url(#heroSceneHillGreen)"
          />
        </g>

        <g className="hero-static-pin" filter="url(#heroScenePinShadow)" opacity="0.7">
          <circle cx="334" cy="365" r="79" fill="none" stroke="#5f6ee8" strokeOpacity="0.1" strokeWidth="1.15" />
          <path
            d="M334 318 C313 318 296 335 296 356 C296 385 334 421 334 421 C334 421 372 385 372 356 C372 335 355 318 334 318 Z"
            fill="url(#heroScenePin)"
          />
          <circle cx="334" cy="356" r="15" fill="#ffffff" opacity="0.9" />
        </g>

        <g className="hero-static-dots" opacity="0.36">
          {dotPoints.map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.55" fill="#8ea5ee" />
          ))}
        </g>

        <g opacity="0.38">
          <image href="/tree.svg" x="675" y="425" width="76" height="106" opacity="0.5" />
          <image href="/tree.svg" x="742" y="392" width="112" height="150" opacity="0.46" />
        </g>
      </svg>

      <svg
        viewBox="0 0 390 260"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-[28%] w-full opacity-32 md:hidden"
      >
        <defs>
          <linearGradient id="heroSceneMobileHill" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#eaf2ff" stopOpacity="0.58" />
            <stop offset="100%" stopColor="#e8fbef" stopOpacity="0.24" />
          </linearGradient>
        </defs>
        <path
          d="M0 178 C78 138 151 149 214 174 C281 201 324 142 390 158 V260 H0 Z"
          fill="url(#heroSceneMobileHill)"
        />
        <circle cx="306" cy="100" r="30" fill="#5f6ee8" opacity="0.055" />
      </svg>
    </div>
  );
}
