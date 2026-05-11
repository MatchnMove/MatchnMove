export function HeroAmbientScene() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div className="hero-ambient-glow absolute right-[-10%] top-[14%] hidden h-[34rem] w-[46rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(95,110,232,0.18),rgba(34,197,94,0.1)_42%,transparent_70%)] blur-3xl md:block" />

      <svg
        viewBox="0 0 760 560"
        preserveAspectRatio="xMaxYMid meet"
        className="absolute right-[-6rem] top-[8%] hidden h-[74%] w-[58%] max-w-[820px] opacity-80 md:block lg:right-[-2rem] lg:w-[54%]"
      >
        <defs>
          <linearGradient id="ambientHillBlue" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#dce8ff" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#eff6ff" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="ambientHillGreen" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#c7f2d8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#edfdf3" stopOpacity="0.07" />
          </linearGradient>
          <linearGradient id="ambientHouse" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#dce7ff" stopOpacity="0.62" />
            <stop offset="100%" stopColor="#f6f9ff" stopOpacity="0.22" />
          </linearGradient>
          <linearGradient id="ambientPin" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#5f6ee8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#7cc9b8" stopOpacity="0.7" />
          </linearGradient>
          <filter id="ambientSoftShadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="12" stdDeviation="18" floodColor="#5f6ee8" floodOpacity="0.12" />
          </filter>
        </defs>

        <g opacity="0.55">
          <path
            d="M304 184 L408 72 C416 64 428 64 436 72 L540 184 C547 191 542 203 532 203 H511 V389 H333 V203 H312 C302 203 297 191 304 184 Z"
            fill="url(#ambientHouse)"
          />
          <path
            d="M550 323 L634 236 C642 228 654 228 662 236 L746 323 C753 330 748 342 738 342 H718 V447 H578 V342 H558 C548 342 543 330 550 323 Z"
            fill="url(#ambientHouse)"
            opacity="0.72"
          />
          <path
            d="M626 447 V392 C626 370 644 352 666 352 C688 352 706 370 706 392 V447"
            fill="#f8fbff"
            opacity="0.55"
          />
        </g>

        <g className="hero-ambient-dots" opacity="0.42">
          {[
            [625, 84],
            [647, 84],
            [669, 84],
            [691, 84],
            [625, 106],
            [647, 106],
            [669, 106],
            [691, 106],
            [625, 128],
            [647, 128],
            [669, 128],
            [691, 128]
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.4" fill="#5f6ee8" opacity="0.42" />
          ))}
        </g>

        <g opacity="0.62">
          <path
            d="M0 477 C117 430 209 443 300 466 C403 492 472 400 590 404 C662 407 710 431 760 454 V560 H0 Z"
            fill="url(#ambientHillBlue)"
          />
          <path
            d="M236 529 C338 438 449 401 570 416 C644 425 706 468 760 500 V560 H236 Z"
            fill="url(#ambientHillGreen)"
          />
        </g>

        <g filter="url(#ambientSoftShadow)">
          <circle cx="312" cy="298" r="70" fill="none" stroke="#5f6ee8" strokeOpacity="0.12" />
          <g className="hero-ambient-pin">
            <path
              d="M312 250 C289 250 271 268 271 291 C271 323 312 363 312 363 C312 363 353 323 353 291 C353 268 335 250 312 250 Z"
              fill="url(#ambientPin)"
              opacity="0.7"
            />
            <circle cx="312" cy="291" r="16" fill="white" opacity="0.88" />
          </g>
        </g>

        <g opacity="0.36">
          <path d="M626 500 V440" stroke="#37b56c" strokeWidth="5" strokeLinecap="round" opacity="0.5" />
          <path d="M626 470 L603 448" stroke="#37b56c" strokeWidth="3" strokeLinecap="round" opacity="0.42" />
          <path d="M626 472 L648 450" stroke="#37b56c" strokeWidth="3" strokeLinecap="round" opacity="0.42" />
          <ellipse cx="626" cy="431" rx="24" ry="39" fill="#86d8a2" opacity="0.5" />
          <ellipse cx="649" cy="415" rx="21" ry="32" fill="#7cc9b8" opacity="0.34" />

          <path d="M700 502 V463" stroke="#37b56c" strokeWidth="4" strokeLinecap="round" opacity="0.45" />
          <path d="M700 483 L683 468" stroke="#37b56c" strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
          <ellipse cx="700" cy="454" rx="18" ry="28" fill="#86d8a2" opacity="0.42" />
        </g>

        <g opacity="0.22">
          <path d="M204 216 C215 191 248 191 260 216 H204 Z" fill="#dce7ff" />
          <path d="M585 168 C596 143 629 143 641 168 H585 Z" fill="#dce7ff" />
          <path d="M690 238 C697 222 719 222 727 238 H690 Z" fill="#dce7ff" />
        </g>
      </svg>

      <svg
        viewBox="0 0 390 260"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-[30%] w-full opacity-45 md:hidden"
      >
        <defs>
          <linearGradient id="ambientMobileHill" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#dcfce7" stopOpacity="0.18" />
          </linearGradient>
        </defs>
        <path
          d="M0 175 C80 134 146 146 205 171 C274 200 323 137 390 154 V260 H0 Z"
          fill="url(#ambientMobileHill)"
        />
        <circle cx="310" cy="96" r="30" fill="#5f6ee8" opacity="0.07" />
      </svg>
    </div>
  );
}
