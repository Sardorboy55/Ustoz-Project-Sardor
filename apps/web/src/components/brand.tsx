import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/**
 * IBILIM logo mark — three rounded bars. Inline SVG so it stays crisp at any
 * size and inherits its colour via `currentColor` (set the colour on a parent).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1180 820"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <rect y="406.07" width="220" height="585" rx="110" transform="rotate(-45 0 406.07)" />
      <rect x="766.07" y="819.727" width="220" height="585" rx="110" transform="rotate(-135 766.07 819.727)" />
      <rect x="480" width="220" height="502" rx="110" />
    </svg>
  );
}

/** IBILIM wordmark: logo mark + bold wordmark with an amber accent dot. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="IBILIM"
      className={cn(
        "flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2",
        className,
      )}
    >
      <LogoMark className="h-6 w-auto text-brand-600" />
      <span className="text-xl font-extrabold leading-none tracking-tight text-brand-700">
        IBILIM
        <span className="text-accent-500">.</span>
      </span>
    </Link>
  );
}
