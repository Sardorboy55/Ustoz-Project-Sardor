"use client";

import type { ReactNode } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { Button, ButtonLink } from "./button";

/**
 * Human-friendly error block with a retry button.
 * Pass `onRetry` from client code, or `retryHref` when rendered from a
 * server component (functions can't cross the RSC boundary).
 */
export function ErrorState({
  title,
  description,
  onRetry,
  retryHref,
  retryLabel,
  action,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryHref?: string;
  retryLabel?: string;
  action?: ReactNode;
  className?: string;
}) {
  const t = useTranslations("Errors");
  const label = retryLabel ?? t("retry");

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white px-6 py-14 text-center",
        className,
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
        <TriangleAlert size={26} aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-lg font-semibold text-zinc-900">
        {title ?? t("title")}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-zinc-500">
        {description ?? t("description")}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            <RefreshCw size={16} aria-hidden="true" />
            {label}
          </Button>
        )}
        {!onRetry && retryHref && (
          <ButtonLink variant="secondary" href={retryHref}>
            <RefreshCw size={16} aria-hidden="true" />
            {label}
          </ButtonLink>
        )}
        {action}
      </div>
    </div>
  );
}
