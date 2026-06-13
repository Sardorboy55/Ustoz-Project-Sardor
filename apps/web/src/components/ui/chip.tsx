import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

const chipClasses = (active: boolean, className?: string) =>
  cn(
    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1",
    active
      ? "border-brand-600 bg-brand-600 text-white"
      : "border-zinc-300 bg-white text-zinc-700 hover:border-brand-400 hover:text-brand-700",
    className,
  );

export type FilterChipProps = {
  active?: boolean;
  /** Renders as a locale-aware link when set… */
  href?: string;
  /** …or as a button when `onClick` is used (client components only). */
  onClick?: () => void;
  className?: string;
  children: ReactNode;
};

/** Filter chip: fully-rounded toggle, link or button flavored. */
export function FilterChip({
  active = false,
  href,
  onClick,
  className,
  children,
}: FilterChipProps) {
  if (href) {
    return (
      <Link
        href={href}
        aria-current={active ? "true" : undefined}
        className={chipClasses(active, className)}
      >
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={chipClasses(active, className)}
    >
      {children}
    </button>
  );
}
