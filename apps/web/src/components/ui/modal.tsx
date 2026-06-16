"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

/**
 * Modal built on <dialog>: closes on Esc and backdrop click,
 * controlled via `open` / `onClose`.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  size = "lg",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  size?: "lg" | "xl" | "2xl" | "3xl" | "4xl";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useTranslations("Ui");
  const widthClass = {
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
  }[size];

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        // Esc — keep React state in sync instead of letting the dialog
        // close itself silently.
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Clicks land on the <dialog> element itself only on the backdrop.
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] rounded-2xl bg-white p-0 shadow-xl backdrop:bg-zinc-900/50",
        widthClass,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-5">
        {title ? (
          <h2 className="text-lg font-bold text-zinc-900">{title}</h2>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="px-6 pb-6 pt-2">{children}</div>
    </dialog>
  );
}
