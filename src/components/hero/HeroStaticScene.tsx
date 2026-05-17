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
            <stop offset="0%" stopColor="#d9e7ff" stopOpacity="0.44" />
            <stop offset="68%" stopColor="#ecf4ff" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="heroSceneHillGreen" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#d9f6e1" stopOpacity="0.42" />
            <stop offset="74%" stopColor="#edfdf3" stopOpacity="0.16" />
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

        <g opacity="0.55">
          <image href="/house.svg" x="338" y="80" width="244" height="244" opacity="0.34" />
          <image href="/house.svg" x="618" y="272" width="194" height="194" opacity="0.24" />
        </g>

        <g opacity="0.28">
          <image href="/cloud.svg" x="242" y="262" width="70" height="46" opacity="0.36" />
          <image href="/cloud.svg" x="642" y="168" width="76" height="50" opacity="0.32" />
          <image href="/cloud.svg" x="788" y="280" width="66" height="42" opacity="0.3" />
        </g>

        <g opacity="0.56">
          <path
            d="M0 500 C119 444 247 451 371 480 C493 509 554 407 689 412 C762 415 816 450 860 480 V560 H0 Z"
            fill="url(#heroSceneHillBlue)"
          />
          <path
            d="M276 560 C385 451 498 419 625 422 C727 425 795 463 860 506 V560 H276 Z"
            fill="url(#heroSceneHillGreen)"
          />
        </g>

        <g className="hero-static-pin" filter="url(#heroScenePinShadow)" opacity="0.7">
          <circle cx="334" cy="365" r="79" fill="none" stroke="#5f6ee8" strokeOpacity="0.1" strokeWidth="1.15" />
          <path
            d="M334 301 C308 301 287 322 287 348 C287 384 334 430 334 430 C334 430 381 384 381 348 C381 322 360 301 334 301 Z"
            fill="url(#heroScenePin)"
          />
          <circle cx="334" cy="348" r="18" fill="#ffffff" opacity="0.9" />
        </g>

        <g className="hero-static-dots" opacity="0.36">
          {dotPoints.map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.55" fill="#8ea5ee" />
          ))}
        </g>

        <g opacity="0.38">
          <image href="/tree.svg" x="690" y="426" width="82" height="112" opacity="0.5" />
          <image href="/tree.svg" x="736" y="392" width="118" height="154" opacity="0.46" />
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
