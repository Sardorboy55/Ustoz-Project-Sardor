import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Section title + optional subtitle + optional action. Centered by default
 * (marketing sections); pass align="left" for in-content sections like the
 * teacher profile, where the title sits on the edge with the action on the right.
 */
export function SectionHeading({
  title,
  subtitle,
  action,
  align = "center",
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  const left = align === "left";
  return (
    <div
      className={cn(
        left
          ? "flex flex-wrap items-end justify-between gap-x-6 gap-y-3"
          : "flex flex-col items-center gap-y-3 text-center",
        className,
      )}
    >
      <div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
          {title}
        </h2>
        {subtitle && (
          <p
            className={cn(
              "mt-1 text-sm text-zinc-500",
              !left && "mx-auto max-w-2xl",
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className={cn(left && "shrink-0")}>{action}</div>}
    </div>
  );
}
