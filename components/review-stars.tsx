import { Star } from "lucide-react";
import { cx } from "@/lib/utils";

export function ReviewStars({
  rating,
  size = "md",
  className,
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const iconClassName =
    size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4";

  return (
    <div className={cx("flex items-center gap-1", className)}>
      {Array.from({ length: 5 }).map((_, index) => {
        const active = index < Math.round(rating);
        return (
          <Star
            key={index}
            className={cx(iconClassName, active ? "fill-amber-400 text-amber-400" : "text-slate-300")}
          />
        );
      })}
    </div>
  );
}
