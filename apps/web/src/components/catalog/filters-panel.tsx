"use client";

import { useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Responsive shell for the catalog filters: a sticky sidebar on desktop,
 * a collapsible panel behind a "Filters" button on mobile.
 * Children are server-rendered filter fields (single instance — the page
 * is wrapped in one GET form, so fields must not be duplicated).
 */
export function FiltersPanel({
  label,
  activeCount = 0,
  children,
}: {
  label: string;
  /** Number of active filters, shown as a badge on the mobile button. */
  activeCount?: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 outline-none transition-colors hover:border-brand-400 hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-600 lg:hidden"
      >
        <SlidersHorizontal size={16} aria-hidden="true" />
        {label}
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>
      <aside
        className={cn(
          open ? "block" : "hidden",
          "mb-6 lg:mb-0 lg:block lg:sticky lg:top-24",
        )}
      >
        {children}
      </aside>
    </>
  );
}
