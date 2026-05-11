export function HeroStaticScene() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden lg:block"
    >
      <svg
        viewBox="0 0 860 560"
        preserveAspectRatio="xMaxYMid meet"
        className="absolute right-[-4rem] top-[12%] h-[76%] w-[58%] max-w-[1160px] opacity-95 xl:right-12 xl:w-[64%]"
      >
        <defs>
          <linearGradient id="staticSceneHouse" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#dfe8ff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f8fbff" stopOpacity="0.18" />
          </linearGradient>
          <linearGradient id="staticSceneHouseSoft" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#dbe5ff" stopOpacity="0.52" />
            <stop offset="100%" stopColor="#f9fbff" stopOpacity="0.14" />
          </linearGradient>
          <linearGradient id="staticSceneHillBlue" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#dbe7ff" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#eff6ff" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="staticSceneHillGreen" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#d7f6df" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#effdf4" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient id="staticScenePin" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#5d73f0" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#91bcff" stopOpacity="0.45" />
          </linearGradient>
          <radialGradient id="staticSceneGlow" cx="50%" cy="42%" r="58%">
            <stop offset="0%" stopColor="#d9f7ec" stopOpacity="0.34" />
            <stop offset="48%" stopColor="#eaf4ff" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <filter id="staticScenePinShadow" x="-45%" y="-45%" width="190%" height="190%">
            <feDropShadow dx="0" dy="15" stdDeviation="18" floodColor="#5f6ee8" floodOpacity="0.09" />
          </filter>
          <filter id="staticSceneTreeShadow" x="-40%" y="-35%" width="180%" height="175%">
            <feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#33a06f" floodOpacity="0.08" />
          </filter>
        </defs>

        <rect x="38" y="10" width="820" height="530" fill="url(#staticSceneGlow)" opacity="0.62" />

        <g opacity="0.52">
          <path
            d="M318 198 L444 60 C452 51 466 51 474 60 L600 198 C607 206 601 218 590 218 H564 V414 H354 V218 H328 C317 218 311 206 318 198 Z"
            fill="url(#staticSceneHouse)"
          />
          <rect x="365" y="210" width="188" height="207" fill="url(#staticSceneHouse)" opacity="0.82" />

          <path
            d="M580 345 L684 236 C692 228 705 228 713 236 L817 345 C825 353 819 366 807 366 H783 V452 H615 V366 H590 C578 366 572 353 580 345 Z"
            fill="url(#staticSceneHouseSoft)"
          />
          <rect x="626" y="360" width="148" height="93" fill="url(#staticSceneHouseSoft)" opacity="0.9" />
          <path
            d="M670 453 V408 C670 384 689 365 713 365 C737 365 756 384 756 408 V453"
            fill="#ffffff"
            opacity="0.42"
          />
        </g>

        <g opacity="0.34">
          <path d="M238 282 C248 256 282 256 292 282 H238 Z" fill="#dfe8ff" />
          <path d="M640 186 C651 158 689 158 700 186 H640 Z" fill="#dfe8ff" />
          <path d="M793 297 C801 276 831 276 839 297 H793 Z" fill="#dfe8ff" />
        </g>

        <g opacity="0.55">
          <path
            d="M0 500 C122 442 247 452 368 480 C489 509 552 405 687 411 C762 414 817 449 860 480 V560 H0 Z"
            fill="url(#staticSceneHillBlue)"
          />
          <path
            d="M278 559 C383 452 493 418 622 422 C725 425 794 462 860 506 V560 H278 Z"
            fill="url(#staticSceneHillGreen)"
          />
        </g>

        <g filter="url(#staticScenePinShadow)" opacity="0.68">
          <circle cx="333" cy="345" r="78" fill="none" stroke="#5f6ee8" strokeOpacity="0.12" strokeWidth="1.2" />
          <path
            d="M333 302 C307 302 286 323 286 349 C286 385 333 430 333 430 C333 430 380 385 380 349 C380 323 359 302 333 302 Z"
            fill="url(#staticScenePin)"
          />
          <circle cx="333" cy="349" r="18" fill="#ffffff" opacity="0.88" />
        </g>

        <g opacity="0.38">
          {[
            [745, 84],
            [768, 84],
            [791, 84],
            [814, 84],
            [745, 107],
            [768, 107],
            [791, 107],
            [814, 107],
            [745, 130],
            [768, 130],
            [791, 130],
            [814, 130],
            [745, 153],
            [768, 153],
            [791, 153],
            [814, 153]
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.6" fill="#92a9ef" />
          ))}
        </g>

        <g filter="url(#staticSceneTreeShadow)" opacity="0.42">
          <path d="M704 520 V466" stroke="#6bc994" strokeWidth="5" strokeLinecap="round" />
          <path d="M704 493 L682 474" stroke="#6bc994" strokeWidth="3" strokeLinecap="round" />
          <path d="M704 496 L724 476" stroke="#6bc994" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="704" cy="456" rx="21" ry="33" fill="#92d9ad" />

          <path d="M773 522 V438" stroke="#66c68e" strokeWidth="6" strokeLinecap="round" />
          <path d="M773 486 L747 461" stroke="#66c68e" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M773 487 L800 462" stroke="#66c68e" strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx="773" cy="433" rx="25" ry="44" fill="#86d7a6" />
          <ellipse cx="800" cy="420" rx="22" ry="34" fill="#7cc9b8" opacity="0.58" />
          <ellipse cx="745" cy="455" rx="19" ry="31" fill="#9ce2b6" opacity="0.72" />
        </g>
      </svg>
    </div>
  );
}
