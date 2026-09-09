"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import styles from "./HeroTruckScene.module.css";

/** A lightweight, layered illustration: motion runs entirely on CSS transforms. */
export function HeroTruckScene() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const id = useId().replace(/:/g, "");
  const [reducedMotion, setReducedMotion] = useState(true);
  const [motionChoice, setMotionChoice] = useState<boolean | null>(null);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const wantsMotion = motionChoice ?? !reducedMotion;
  const isMoving = wantsMotion && inView && pageVisible;

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    const updateVisibility = () => setPageVisible(!document.hidden);
    updatePreference();
    updateVisibility();
    preference.addEventListener("change", updatePreference);
    document.addEventListener("visibilitychange", updateVisibility);

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        setHydrated(true);
      },
      { threshold: 0.08 },
    );
    if (sceneRef.current) observer.observe(sceneRef.current);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", updatePreference);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  const wheel = (x: number, y: number, radius = 31) => (
    <g transform={`translate(${x} ${y})`}>
      <circle r={radius} fill={`url(#${id}-tyre)`} />
      <circle r={radius - 4} fill="none" stroke="#4b5b6c" strokeWidth="1.4" />
      <circle r={radius * 0.64} fill={`url(#${id}-rim)`} stroke="#a0afbd" strokeWidth="1" />
      <g className={`${styles.wheelTurn} ${styles.animated}`}>
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <g key={angle} transform={`rotate(${angle})`}>
            <path d="M-3-8 -4-15 Q0-18 4-15 L3-8Z" fill="#5a7084" />
            <circle cy="-6" r="1.35" fill="#f5f7fa" />
          </g>
        ))}
      </g>
      <circle r="5.5" fill="#e0e6eb" stroke="#94a5b5" strokeWidth="1.5" />
      <path d={`M${-radius + 5} -9 A${radius - 4} ${radius - 4} 0 0 1 0 ${-radius + 4}`} stroke="#6c7d8c" fill="none" strokeWidth="1.4" opacity=".65" />
    </g>
  );

  return (
    <div
      ref={sceneRef}
      className={styles.scene}
      data-motion={isMoving ? "playing" : "paused"}
      data-hydrated={hydrated}
    >
      {/* Keep a fixed intrinsic ratio: wider screens reveal additional tiles,
          while the mobile scene scales the entire illustration uniformly. */}
      <svg
        className={styles.landscape}
        width="6400"
        height="260"
        viewBox="-2560 0 6400 260"
        preserveAspectRatio="xMidYMax meet"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${id}-hill-fade`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#839bb8" stopOpacity=".22" />
            <stop offset="1" stopColor="#839bb8" stopOpacity=".025" />
          </linearGradient>
          <linearGradient id={`${id}-road-fade`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#9db5d0" stopOpacity=".09" />
            <stop offset="1" stopColor="#9db5d0" stopOpacity="0" />
          </linearGradient>
          <g id={`${id}-hills`}>
            <path d="M0 182 Q100 151 194 174 T387 159 Q476 117 559 152 T749 140 Q846 99 944 154 T1110 160 Q1200 155 1280 182 V230H0Z" fill={`url(#${id}-hill-fade)`} />
            <path d="M0 201 Q93 177 189 194 T385 181 Q483 166 568 194 T772 178 Q871 162 965 191 T1160 186 Q1215 184 1280 201" fill="none" stroke="#a9bed5" strokeOpacity=".1" />
          </g>
          <g id={`${id}-skyline`} fill="#91acc7" fillOpacity=".14" stroke="#b5cbe4" strokeOpacity=".13" strokeWidth=".8">
            <path d="M716 207V165H733V146H743V165H754V207 M765 207V131H795V207 M774 131V124H786V131 M809 207V159H839V207 M847 207V141H862V135H881V207 M923 207V152H945V139H962V207 M980 207V169H1006V157H1022V207 M1044 207V183H1069V172H1089V207" />
            <path d="M893 207 896 92 891 87V82H897L899 65H898V61H900L901 27H902L904 61H906V65H905L908 82H913V87L908 92 911 207Z" />
            <path d="M886 84H917 M892 78H911 M772 145H788 M774 153H788 M774 161H788 M817 171H829 M933 161H951 M933 170H951" fill="none" />
          </g>
          <g id={`${id}-neighbourhood`}>
            <g stroke="#a2b8d0" strokeOpacity=".28" strokeWidth="1.1" strokeLinejoin="round">
              <path d="M101 217V179L143 153 187 179V217" fill="#344b66" fillOpacity=".55" />
              <path d="m88 181 55-36 57 36 M108 180H180 M143 154V146" fill="none" />
              <path d="M154 217V190H173V217 M115 189H137V205H115Z" fill="#b0c6dc" fillOpacity=".11" />
              <path d="M213 217V195L240 176 269 195V217 M205 197 240 170 277 197" fill="#344b66" fillOpacity=".38" />
              <path d="M235 217V202H247V217" fill="none" />
              <path d="M1100 217V184L1139 159 1180 184V217 M1090 187 1139 151 1190 187" fill="#344b66" fillOpacity=".38" />
              <path d="M1113 189H1130V204H1113Z M1151 217V188H1168V217" fill="#b0c6dc" fillOpacity=".09" />
            </g>
            <g fill="#506d87" fillOpacity=".35">
              <path d="M39 216V182C19 181 18 164 29 157 20 145 29 132 39 132 51 132 59 144 51 155 64 165 59 182 42 182V216Z" />
              <path d="M301 216V192C286 190 284 176 294 171 288 160 297 151 304 152 315 153 319 164 313 171 325 180 320 194 305 193V216Z" />
              <path d="M1048 216V185C1028 184 1025 169 1037 160 1031 147 1040 136 1050 136 1062 137 1066 151 1059 160 1074 170 1068 185 1052 185V216Z" />
              <path d="M1226 216V193C1211 191 1209 180 1218 172 1211 161 1219 151 1228 151 1238 151 1246 163 1238 172 1250 181 1245 194 1230 193V216Z" />
            </g>
            <path d="M0 219H1280" stroke="#b5cbe4" strokeOpacity=".14" />
          </g>
          <pattern id={`${id}-road-dashes`} width="180" height="5" patternUnits="userSpaceOnUse">
            <path d="M0 2H54" stroke="#b5cbe4" strokeOpacity=".22" strokeWidth="1.5" />
          </pattern>
        </defs>
        <circle cx="1026" cy="54" r="28" fill="#dae5f1" fillOpacity=".045" />
        <g className={`${styles.hillsDrift} ${styles.animated}`}>
          {[-2560, -1280, 0, 1280, 2560, 3840].map((offset) => (
            <use key={offset} href={`#${id}-hills`} x={offset} />
          ))}
        </g>
        <g className={`${styles.skylineDrift} ${styles.animated}`}>
          {[-2560, -1280, 0, 1280, 2560, 3840].map((offset) => (
            <use key={offset} href={`#${id}-skyline`} x={offset} />
          ))}
        </g>
        <g className={`${styles.neighbourhoodDrift} ${styles.animated}`}>
          {[-2560, -1280, 0, 1280, 2560, 3840].map((offset) => (
            <use key={offset} href={`#${id}-neighbourhood`} x={offset} />
          ))}
        </g>
        <path d="M-2560 220H3840V260H-2560Z" fill={`url(#${id}-road-fade)`} />
        <g className={`${styles.roadDrift} ${styles.animated}`}>
          <path d="M-2560 238H4020V243H-2560Z" fill={`url(#${id}-road-dashes)`} />
        </g>
      </svg>

      <div className={styles.vehicle} aria-hidden="true">
        <svg viewBox="0 0 540 270" className={styles.truck} fontFamily="Arial, Helvetica, sans-serif">
          <defs>
            <linearGradient id={`${id}-cargo`} x1="0" y1="0" x2=".7" y2="1">
              <stop stopColor="#fffdf7" />
              <stop offset=".55" stopColor="#f4f5f2" />
              <stop offset="1" stopColor="#dce3e8" />
            </linearGradient>
            <linearGradient id={`${id}-cab`} x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#a3b6c6" />
              <stop offset=".5" stopColor="#728ba1" />
              <stop offset="1" stopColor="#435766" />
            </linearGradient>
            <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#779cb8" />
              <stop offset=".45" stopColor="#314e67" />
              <stop offset="1" stopColor="#1b344d" />
            </linearGradient>
            <radialGradient id={`${id}-tyre`} cx=".4" cy=".3" r=".7">
              <stop stopColor="#364454" />
              <stop offset=".65" stopColor="#1b2938" />
              <stop offset="1" stopColor="#0b1625" />
            </radialGradient>
            <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#f0f4f8" />
              <stop offset=".5" stopColor="#c1ccd5" />
              <stop offset="1" stopColor="#70889f" />
            </linearGradient>
            <radialGradient id={`${id}-shadow`}>
              <stop stopColor="#030c19" stopOpacity=".55" />
              <stop offset="1" stopColor="#030c19" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="274" cy="257" rx="243" ry="12" fill={`url(#${id}-shadow)`} />
          <path d="M56 199 354 193 479 202 478 231 151 234 56 225Z" fill="#172330" />
          <path d="M173 209H256V233H174Z" fill="#4f6475" stroke="#293e50" strokeWidth="2" />
          <path d="M190 210V231 M242 210V230" stroke="#91a3b2" strokeWidth="4" />
          <path d="M283 210H337V223H283Z" fill="#adbcc9" />
          <path d="M290 214H330 M290 219H330" stroke="#5c7893" strokeWidth="2" />

          <g className={`${styles.suspension} ${styles.animated}`}>
            <path d="M38 38 68 21 341 8 341 25Z" fill="#f9f8f3" />
            <path d="M341 8 377 29 377 196 341 204Z" fill="#bdcbd6" />
            <path d="M38 38 341 24V203L38 204Z" fill={`url(#${id}-cargo)`} stroke="#dce3e9" strokeWidth="1.5" />
            <path d="M45 44 334 31 M45 47V194 M333 34V194" fill="none" stroke="#ffffff" strokeOpacity=".8" strokeWidth="1.5" />
            <path d="M42 192 337 191V202L42 203Z" fill="#bac6d0" />
            <path d="M44 193 337 192" stroke="#f0f4f7" strokeWidth="2" />
            <path d="M347 29 369 40V178L347 185Z" fill="#acbdcb" />
            <path d="M357 35V178" stroke="#d4dfe7" strokeOpacity=".65" />
            <g fill="#de7a3a">
              <rect x="42" y="39" width="10" height="4" rx="1" />
              <rect x="323" y="26" width="10" height="4" rx="1" />
              <rect x="42" y="196" width="7" height="4" rx="1" />
            </g>
            <g fill="#152c4b">
              <path d="m74 86 14-8 15 8v17l-15 8-14-8Z" fill="#344f72" />
              <path d="m76 87 12 6 13-6-13-7Z" fill="#9ab0ca" />
              <path d="M79 98H95 M92 95 95 98 92 101" fill="none" stroke="#f6f7f9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <text x="114" y="101" fontFamily="Arial, Helvetica, sans-serif" fontSize="24" fontWeight="750" letterSpacing="-.8">Match ’n Move</text>
              <text x="75" y="123" fontFamily="Arial, Helvetica, sans-serif" fontSize="9.5" fontWeight="500" letterSpacing=".55" fill="#627387">A LITTLE LESS MOVING STRESS.</text>
            </g>
            <path d="M75 160H120C137 160 134 146 152 146H209C224 146 222 160 238 160H284" fill="none" stroke="#a2b4c6" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 5" />
            <circle cx="75" cy="160" r="5" fill="#344f72" />
            <circle cx="284" cy="160" r="5" fill="#de7a3a" />
            <circle cx="75" cy="160" r="2" fill="#f7f7f1" />
            <circle cx="284" cy="160" r="2" fill="#f7f7f1" />

            <path d="M344 103Q344 94 354 94L415 94 451 115 463 166 466 220 438 224C437 181 366 179 365 222L344 221Z" fill={`url(#${id}-cab)`} stroke="#95aabe" strokeWidth="1" />
            <path d="M354 94 415 94 451 115 390 110Z" fill="#cbd5dc" />
            <path d="M415 94 451 115 489 170Q492 175 493 186L496 218 466 233 463 168Z" fill="#4f667c" />
            <path d="M358 109 405 109 436 151 359 154Z" fill={`url(#${id}-glass)`} stroke="#bdccd7" strokeWidth="2" strokeLinejoin="round" />
            <path d="M365 114H391L418 146 400 148Z" fill="#b7cddd" fillOpacity=".13" />
            <path d="M395 110 421 152" stroke="#a2b8c8" strokeWidth="2" />
            <path d="M424 109 446 122 480 171 463 174 442 147Z" fill={`url(#${id}-glass)`} stroke="#adbfcc" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="m435 120 9 6 28 39-10-4Z" fill="#d0dce6" fillOpacity=".15" />
            <path d="m462 168 12-1 M459 164l2 8 M473 166l8 7" stroke="#172a3b" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d="M353 158V201 M437 158 441 181 M353 161 437 158" fill="none" stroke="#3d5468" strokeWidth="1.3" />
            <rect x="359" y="170" width="16" height="4" rx="2" fill="#2c4052" />
            <path d="M441 139 450 137 452 159" fill="none" stroke="#213648" strokeWidth="3" strokeLinecap="round" />
            <rect x="446" y="144" width="10" height="19" rx="3" fill="#2e4558" stroke="#8299ae" strokeWidth="1" />
            <path d="M465 182 491 179 493 205 467 211Z" fill="#233847" />
            <path d="M470 187 487 185 M470 193 488 191 M471 199 489 197" stroke="#718ba0" strokeWidth="2" strokeLinecap="round" />
            <path d="m473 205 17-4 2 10-18 5Z" fill="#faf1ce" />
            <path d="m474 209 14-4" stroke="#fffbea" strokeWidth="2" />
            <path d="M465 219 496 208 497 220 466 233 439 229 441 219Z" fill="#304454" />
            <path d="m467 224 22-9" stroke="#a0b2c1" strokeWidth="3" strokeLinecap="round" />
            <path d="M367 222C369 180 433 180 438 225" fill="none" stroke="#293e4f" strokeWidth="10" />
            <path d="M370 211C382 180 424 188 433 213" fill="none" stroke="#b4c3ce" strokeOpacity=".75" strokeWidth="2" />
            <rect x="349" y="199" width="8" height="5" rx="1.5" fill="#f7931e" />
            <path d="M76 222C77 181 143 181 146 222" fill="none" stroke="#2b3b4a" strokeWidth="9" />
            <rect x="37" y="208" width="10" height="13" rx="2" fill="#374a5d" />
            <rect x="38" y="209" width="5" height="7" rx="1" fill="#c57c49" />
          </g>
          {wheel(111, 224)}
          {wheel(401, 224)}
        </svg>
      </div>

      <button
        type="button"
        className={styles.motionControl}
        onClick={() => setMotionChoice(!wantsMotion)}
        aria-label={wantsMotion ? "Pause truck animation" : "Play truck animation"}
        title={wantsMotion ? "Pause animation" : "Play animation"}
      >
        {wantsMotion ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
      </button>
    </div>
  );
}
