import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/**
 * Gradient "Join Plus+" membership CTA — links to the pricing/plans page.
 * Gradient ring + gradient text on a white pill; brightens on hover.
 */
export function JoinPlusButton({ className }: { className?: string }) {
  return (
    <Link
      href="/pricing"
      className={cn(
        "group inline-flex shrink-0 rounded-full bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-600 p-px shadow-sm outline-none transition hover:shadow-md hover:brightness-105 focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:ring-offset-2",
        className,
      )}
    >
      <span className="inline-flex h-9 w-full items-center justify-center rounded-full bg-white px-4">
        <span className="bg-gradient-to-r from-rose-500 to-indigo-600 bg-clip-text text-sm font-extrabold italic tracking-tight text-transparent">
          Join Plus+
        </span>
      </span>
    </Link>
  );
}
