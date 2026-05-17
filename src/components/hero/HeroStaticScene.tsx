const dotPoints = [
  [718, 82],
  [742, 82],
  [766, 82],
  [790, 82],
  [718, 106],
  [742, 106],
  [766, 106],
  [790, 106],
  [718, 130],
  [742, 130],
  [766, 130],
  [790, 130],
  [718, 154],
  [742, 154],
  [766, 154],
  [790, 154],
];

export function HeroStaticScene() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div className="hero-static-glow absolute right-[-8%] top-[18%] hidden h-[25rem] w-[35rem] rounded-full bg-[radial-gradient(circle_at_52%_44%,rgba(95,110,232,0.075),rgba(125,201,184,0.075)_46%,rgba(255,255,255,0)_74%)] md:block lg:right-[-3%]" />

      <svg
        viewBox="0 0 860 560"
        preserveAspectRatio="xMaxYMid meet"
        className="absolute right-[-13rem] top-[23%] hidden h-[62%] w-[80%] opacity-28 md:block lg:right-[-2rem] lg:top-[15%] lg:h-[72%] lg:w-[55%] lg:opacity-100 xl:right-12 xl:w-[59%]"
      >
        <defs>
          <linearGradient id="heroSceneHouse" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#dfe8ff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#fbfdff" stopOpacity="0.13" />
          </linearGradient>
          <linearGradient id="heroSceneHouseSoft" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#d7e2ff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="heroSceneHillBlue" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#dbe8ff" stopOpacity="0.36" />
            <stop offset="72%" stopColor="#eef6ff" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="heroSceneHillGreen" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#daf7e3" stopOpacity="0.34" />
            <stop offset="76%" stopColor="#effdf4" stopOpacity="0.13" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="heroScenePin" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#5f6ee8" stopOpacity="0.58" />
            <stop offset="100%" stopColor="#9fb8ff" stopOpacity="0.42" />
          </linearGradient>
          <radialGradient id="heroSceneGroundGlow" cx="60%" cy="46%" r="56%">
            <stop offset="0%" stopColor="#e9fbf3" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#edf6ff" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="185" y="72" width="640" height="430" fill="url(#heroSceneGroundGlow)" opacity="0.64" />

        <g opacity="0.5">
          <path
            d="M352 191 L444 88 C452 79 466 79 474 88 L566 191 C573 199 568 211 557 211 H539 V409 H379 V211 H361 C350 211 345 199 352 191 Z"
            fill="url(#heroSceneHouse)"
          />
          <rect x="392" y="205" width="133" height="206" rx="2" fill="url(#heroSceneHouse)" opacity="0.78" />

          <path
            d="M601 339 L681 254 C689 246 701 246 709 254 L789 339 C796 347 791 360 779 360 H762 V452 H628 V360 H611 C599 360 594 347 601 339 Z"
            fill="url(#heroSceneHouseSoft)"
          />
          <rect x="640" y="354" width="110" height="99" rx="2" fill="url(#heroSceneHouseSoft)" opacity="0.78" />
          <path
            d="M674 453 V412 C674 390 692 372 714 372 C736 372 754 390 754 412 V453"
            fill="#ffffff"
            opacity="0.35"
          />
        </g>

        <g opacity="0.23">
          <path d="M244 288 C254 266 284 266 294 288 H244 Z" fill="#dfe8ff" />
          <path d="M637 187 C648 163 682 163 693 187 H637 Z" fill="#dfe8ff" />
          <path d="M790 297 C798 279 824 279 832 297 H790 Z" fill="#dfe8ff" />
        </g>

        <g opacity="0.5">
          <path
            d="M0 505 C120 462 245 466 368 491 C489 516 553 427 685 430 C759 432 815 459 860 486 V560 H0 Z"
            fill="url(#heroSceneHillBlue)"
          />
          <path
            d="M293 560 C403 470 510 439 630 438 C729 437 795 470 860 511 V560 H293 Z"
            fill="url(#heroSceneHillGreen)"
          />
        </g>

        <g className="hero-static-pin" opacity="0.66">
          <circle cx="318" cy="359" r="66" fill="none" stroke="#5f6ee8" strokeOpacity="0.085" strokeWidth="1.1" />
          <path
            d="M318 316 C295 316 277 334 277 357 C277 389 318 428 318 428 C318 428 359 389 359 357 C359 334 341 316 318 316 Z"
            fill="url(#heroScenePin)"
          />
          <circle cx="318" cy="357" r="15" fill="#ffffff" opacity="0.9" />
        </g>

        <g className="hero-static-dots" opacity="0.32">
          {dotPoints.map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.35" fill="#8ea5ee" />
          ))}
        </g>

        <g opacity="0.34">
          <path d="M690 525 V482" stroke="#78d19c" strokeWidth="4" strokeLinecap="round" />
          <path d="M690 506 L672 491" stroke="#78d19c" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M690 507 L707 491" stroke="#78d19c" strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="690" cy="473" rx="17" ry="27" fill="#a4e4bb" />

          <path d="M755 528 V459" stroke="#72ce96" strokeWidth="5" strokeLinecap="round" />
          <path d="M755 498 L734 478" stroke="#72ce96" strokeWidth="3" strokeLinecap="round" />
          <path d="M755 499 L777 478" stroke="#72ce96" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="755" cy="451" rx="22" ry="39" fill="#95ddb0" />
          <ellipse cx="783" cy="447" rx="17" ry="28" fill="#8bd3c5" opacity="0.55" />
        </g>
      </svg>

      <svg
        viewBox="0 0 390 260"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-[26%] w-full opacity-24 md:hidden"
      >
        <defs>
          <linearGradient id="heroSceneMobileHill" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#eaf2ff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#e8fbef" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <path
          d="M0 181 C78 144 150 154 214 177 C282 202 325 148 390 162 V260 H0 Z"
          fill="url(#heroSceneMobileHill)"
        />
        <circle cx="306" cy="104" r="27" fill="#5f6ee8" opacity="0.045" />
      </svg>
    </div>
  );
}
