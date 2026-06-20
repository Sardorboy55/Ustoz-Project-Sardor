import { GraduationCap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/** IBILIM wordmark: teal mark + bold wordmark with an amber accent dot. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2",
        className,
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
        <GraduationCap size={18} strokeWidth={2.25} aria-hidden="true" />
      </span>
      <span className="text-xl font-extrabold leading-none tracking-tight text-brand-700">
        IBILIM
        <span className="text-accent-500">.</span>
      </span>
    </Link>
  );
}
