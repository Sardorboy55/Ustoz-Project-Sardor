import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none",
  secondary:
    "border border-brand-600 bg-white text-brand-700 hover:bg-brand-50 active:bg-brand-100 disabled:border-zinc-300 disabled:bg-white disabled:text-zinc-400",
  ghost:
    "text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 disabled:bg-transparent disabled:text-zinc-400",
  danger:
    "bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800 disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(base, variants[variant], sizes[size], className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, className)}
      {...rest}
    >
      {loading && <Spinner size={size === "lg" ? 18 : 16} />}
      {children}
    </button>
  );
}

export type ButtonLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> & {
  /** Locale-aware internal href (rendered with the i18n <Link>). */
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

/** A link styled exactly like a Button. */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
