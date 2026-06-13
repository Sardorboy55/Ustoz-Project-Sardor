import type { ReactNode } from "react";
import { BadgeCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

export type BadgeVariant =
  | "pro"
  | "verified"
  | "trial"
  | "new"
  | "neutral"
  | "success"
  | "warning"
  | "danger";

const styles: Record<BadgeVariant, string> = {
  pro: "bg-accent-100 text-accent-700 uppercase tracking-wide",
  verified: "bg-brand-100 text-brand-700",
  trial: "bg-brand-50 text-brand-700",
  new: "bg-sky-100 text-sky-700",
  neutral: "bg-zinc-100 text-zinc-600",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-600",
};

export function Badge({
  variant = "neutral",
  className,
  children,
}: {
  variant?: BadgeVariant;
  className?: string;
  children?: ReactNode;
}) {
  const t = useTranslations("Ui");

  const defaultLabel: Partial<Record<BadgeVariant, ReactNode>> = {
    pro: "PRO",
    verified: t("verified"),
    trial: t("freeTrial"),
    new: t("new"),
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
        styles[variant],
        className,
      )}
    >
      {variant === "verified" && <BadgeCheck size={14} aria-hidden="true" />}
      {children ?? defaultLabel[variant]}
    </span>
  );
}
