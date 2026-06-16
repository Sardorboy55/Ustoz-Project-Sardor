"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Lightweight toast: pinned to the top on mobile and the bottom-right on
 * desktop (the convention on most modern sites). Controlled via `open`/`onClose`,
 * auto-dismisses after `duration` ms (set 0 to keep it until dismissed).
 */
export function Toast({
  open,
  onClose,
  children,
  duration = 8000,
  closeLabel = "Закрыть",
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  duration?: number;
  closeLabel?: string;
  className?: string;
}) {
  useEffect(() => {
    if (!open || !duration) return;
    const id = setTimeout(onClose, duration);
    return () => clearTimeout(id);
  }, [open, duration, onClose]);

  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 top-4 z-50 flex justify-center sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:justify-end"
    >
      <div
        className={cn(
          "animate-pop-in pointer-events-auto flex w-full items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl ring-1 ring-black/5 sm:w-auto sm:max-w-sm",
          className,
        )}
      >
        <div className="min-w-0 flex-1 text-sm text-zinc-700">{children}</div>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
