import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/**
 * IBILIM logo — a single SVG asset that already contains both the mark and the
 * "IBILIM" wordmark (public/logo.svg). Links home.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="IBILIM"
      className={cn(
        "inline-flex items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="IBILIM" className="h-7 w-auto" />
    </Link>
  );
}
