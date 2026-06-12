import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Adds a hover lift (shadow + brand border) for clickable cards. */
  hover?: boolean;
};

export function Card({ hover = false, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200 bg-white shadow-sm",
        hover && "transition hover:border-brand-300 hover:shadow-md",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
