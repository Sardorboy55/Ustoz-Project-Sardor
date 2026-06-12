import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

function StarsRow({ size, className }: { size: number; className?: string }) {
  return (
    <span className={cn("flex gap-0.5", className)}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={size} fill="currentColor" strokeWidth={0} />
      ))}
    </span>
  );
}

/**
 * Amber star rating with fractional fill (percentage-clipped overlay).
 * Optionally renders the numeric value and the review count.
 */
export function RatingStars({
  value,
  count,
  size = 16,
  showValue = true,
  className,
}: {
  /** 0..5, fractions supported. */
  value: number;
  /** Review count, rendered as "(N)". */
  count?: number;
  size?: number;
  showValue?: boolean;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(5, value));
  const pct = (clamped / 5) * 100;

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      role="img"
      aria-label={`${clamped.toFixed(1)} / 5`}
    >
      <span className="relative inline-block leading-none">
        <StarsRow size={size} className="text-zinc-200" />
        <span
          className="absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: `${pct}%` }}
        >
          <StarsRow size={size} className="text-accent-500" />
        </span>
      </span>
      {showValue && (
        <span className="text-sm font-semibold text-zinc-900">
          {clamped.toFixed(1)}
          {typeof count === "number" && (
            <span className="font-normal text-zinc-400"> ({count})</span>
          )}
        </span>
      )}
    </span>
  );
}
