import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { SearchX } from "lucide-react";
import { cn } from "@/lib/cn";

/** Friendly empty screen: icon + title + description + optional action. */
export function EmptyState({
  icon: Icon = SearchX,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center",
        className,
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Icon size={26} aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-lg font-semibold text-zinc-900">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-zinc-500">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
