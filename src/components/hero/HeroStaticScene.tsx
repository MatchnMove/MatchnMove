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
          <linearGradient id="heroSceneHousePrimary" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#dfe8ff" stopOpacity="0.58" />
            <stop offset="100%" stopColor="#fbfdff" stopOpacity="0.16" />
          </linearGradient>
          <linearGradient id="heroSceneHouseSecondary" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#d8e3ff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.12" />
          </linearGradient>
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

        <g opacity="0.5">
          <path
            d="M327 193 L449 60 C458 51 471 51 480 60 L602 193 C610 202 604 216 591 216 H568 V414 H359 V216 H338 C325 216 319 202 327 193 Z"
            fill="url(#heroSceneHousePrimary)"
          />
          <rect x="371" y="211" width="186" height="206" rx="2" fill="url(#heroSceneHousePrimary)" opacity="0.72" />

          <path
            d="M585 344 L687 236 C696 227 709 227 718 236 L819 344 C828 354 821 368 807 368 H785 V454 H618 V368 H597 C583 368 576 354 585 344 Z"
            fill="url(#heroSceneHouseSecondary)"
          />
          <rect x="628" y="361" width="147" height="94" rx="2" fill="url(#heroSceneHouseSecondary)" opacity="0.78" />
          <path
            d="M671 454 V409 C671 385 691 365 715 365 C740 365 760 385 760 409 V454"
            fill="#ffffff"
            opacity="0.38"
          />
        </g>

        <g opacity="0.28">
          <path d="M246 281 C256 255 291 255 302 281 H246 Z" fill="#dfe8ff" />
          <path d="M644 186 C656 158 695 158 706 186 H644 Z" fill="#dfe8ff" />
          <path d="M790 297 C799 276 831 276 840 297 H790 Z" fill="#dfe8ff" />
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
          <circle cx="334" cy="344" r="79" fill="none" stroke="#5f6ee8" strokeOpacity="0.1" strokeWidth="1.15" />
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
          <path d="M701 522 V468" stroke="#6ecb96" strokeWidth="5" strokeLinecap="round" />
          <path d="M701 496 L679 476" stroke="#6ecb96" strokeWidth="3" strokeLinecap="round" />
          <path d="M701 498 L723 478" stroke="#6ecb96" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="701" cy="458" rx="21" ry="34" fill="#99ddb1" />

          <path d="M772 524 V438" stroke="#67c98f" strokeWidth="6" strokeLinecap="round" />
          <path d="M772 487 L746 462" stroke="#67c98f" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M772 488 L800 462" stroke="#67c98f" strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx="772" cy="431" rx="25" ry="44" fill="#8cdaad" />
          <ellipse cx="800" cy="419" rx="22" ry="34" fill="#83cdbf" opacity="0.58" />
          <ellipse cx="744" cy="457" rx="19" ry="31" fill="#a3e4bb" opacity="0.7" />
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
