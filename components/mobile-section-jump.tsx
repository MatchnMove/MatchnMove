"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

type MobileSectionJumpProps = {
  targetId: string;
  label: string;
};

export function MobileSectionJump({ targetId, label }: MobileSectionJumpProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    const updateVisibility = () => {
      const rect = target.getBoundingClientRect();

      // Show only after the user has scrolled beyond the bottom of the contents card.
      setIsVisible(rect.bottom < 0);
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, [targetId]);

  return (
    <a
      href={`#${targetId}`}
      aria-label={label}
      className={`fixed bottom-5 right-5 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f172a,#17324f)] text-white shadow-[0_22px_44px_-24px_rgba(15,23,42,0.72)] transition duration-200 hover:translate-y-[-1px] hover:shadow-[0_28px_52px_-24px_rgba(15,23,42,0.82)] lg:hidden ${
        isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <ChevronUp className="h-5 w-5" />
    </a>
  );
}
