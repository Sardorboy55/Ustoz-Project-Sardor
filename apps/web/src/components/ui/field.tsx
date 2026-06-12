import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Shared visual style for Input / Select / Textarea controls. */
export function controlClasses(error?: boolean, className?: string): string {
  return cn(
    "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400",
    error
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
      : "border-zinc-300 focus:border-brand-600 focus:ring-brand-600/20",
    className,
  );
}

/** Label + control + helper/error wrapper shared by all form fields. */
export function FieldWrapper({
  id,
  label,
  helper,
  error,
  className,
  children,
}: {
  id: string;
  label?: string;
  helper?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-sm font-medium text-zinc-700"
        >
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : (
        helper && <p className="mt-1.5 text-xs text-zinc-500">{helper}</p>
      )}
    </div>
  );
}
