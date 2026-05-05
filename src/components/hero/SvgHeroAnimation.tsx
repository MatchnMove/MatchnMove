"use client";

import Image from "next/image";

export function SvgHeroAnimation() {
  return (
    <div
      className="relative h-[240px] w-full lg:h-[340px]"
      style={{ ["--truck-travel" as string]: "clamp(250px, 42vw, 470px)" }}
      aria-label="Moving journey illustration"
    >
      <Image
        src="/animations/grass.svg"
        alt=""
        width={1079}
        height={418}
        className="pointer-events-none absolute inset-x-[-6%] bottom-[-10px] z-10 h-auto w-[112%] max-w-none lg:bottom-[-14px]"
      />

      <div className="absolute bottom-[66px] left-[35%] z-30 -translate-x-1/2 sm:bottom-[78px] lg:bottom-[104px]">
        <div className="relative h-[86px] w-[156px] sm:h-[94px] sm:w-[170px] drop-shadow-[0_10px_18px_rgba(0,0,0,0.16)]">
          <Image src="/animations/c1.svg" alt="" fill className="absolute inset-0 h-full w-full" />
          <Image src="/animations/pin1.svg" alt="" width={24} height={24} className="absolute left-1/2 top-[12px] h-6 w-6 -translate-x-1/2" />
          <Image src="/animations/building1.svg" alt="" width={104} height={43} className="absolute bottom-[6px] left-1/2 w-[98px] -translate-x-1/2 sm:w-[104px]" />
        </div>
      </div>

      <div className="absolute bottom-[66px] left-[71%] z-30 -translate-x-1/2 sm:bottom-[78px] lg:bottom-[104px]">
        <div className="relative h-[86px] w-[156px] sm:h-[94px] sm:w-[170px] drop-shadow-[0_10px_18px_rgba(0,0,0,0.16)]">
          <Image src="/animations/c2.svg" alt="" fill className="absolute inset-0 h-full w-full" />
          <Image src="/animations/pin2.svg" alt="" width={24} height={22} className="absolute left-1/2 top-[12px] h-[22px] w-6 -translate-x-1/2" />
          <Image src="/animations/building2.svg" alt="" width={112} height={55} className="absolute bottom-[4px] left-1/2 w-[104px] -translate-x-1/2 sm:w-[112px]" />
        </div>
      </div>

      <div className="absolute inset-x-[4%] bottom-[14px] z-20 sm:bottom-[16px] lg:bottom-[24px]">
        <div className="relative h-[74px] sm:h-[82px] lg:h-[108px]">
          <div className="hero-truck-drive absolute left-0 top-0">
            <Image src="/animations/truck.svg" alt="" width={124} height={124} className="h-[74px] w-auto sm:h-[82px] lg:h-[108px]" />
          </div>
        </div>
      </div>

      <Image
        src="/animations/pole.svg"
        alt=""
        width={147}
        height={147}
        className="pointer-events-none absolute bottom-[76px] right-[1%] z-20 h-[64px] w-auto sm:bottom-[88px] sm:h-[72px] lg:bottom-[116px] lg:h-[92px]"
      />
    </div>
  );
}
