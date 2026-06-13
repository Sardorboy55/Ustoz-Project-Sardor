import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export type TabItem = {
  href: string;
  label: string;
  active?: boolean;
};

/** Link-based tabs with an underline indicator. */
export function Tabs({
  items,
  className,
}: {
  items: TabItem[];
  className?: string;
}) {
  return (
    <nav
      className={cn(
        "flex gap-6 overflow-x-auto border-b border-zinc-200",
        className,
      )}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "-mb-px whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors",
            item.active
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
