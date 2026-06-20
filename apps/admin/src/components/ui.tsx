"use client";

// Мини-кит UI админки IBILIM: Card, StatCard, Table, Badge, Button, Modal,
// Input/Select, EmptyState, Spinner, Skeleton, Toast.
// Дизайн-система: teal #0E7C66, карточки 16px, кнопки 12px, чипы full.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { BadgeTone, BookingStatus, PayoutStatus } from "@/lib/format";
import { BOOKING_STATUS, PAYOUT_STATUS } from "@/lib/format";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

// ---------- Card ----------

export function Card({
  title,
  action,
  className,
  children,
}: {
  title?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cx(
        "rounded-2xl border border-zinc-200 bg-white shadow-sm",
        className,
      )}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          {title && <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>}
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

// ---------- StatCard ----------

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  hint,
  loading,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  delta?: ReactNode;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-zinc-500">{label}</div>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-24" />
          ) : (
            <div className="mt-1 truncate text-2xl font-bold tracking-tight text-zinc-900">
              {value}
            </div>
          )}
          {delta && <div className="mt-1 text-xs text-zinc-500">{delta}</div>}
          {hint && <div className="mt-1 text-xs text-zinc-400">{hint}</div>}
        </div>
        <div className="rounded-xl bg-brand-tint p-2.5 text-brand">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </div>
  );
}

// ---------- Table ----------

export function Table({
  headers,
  children,
  className,
}: {
  headers: ReactNode[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("overflow-x-auto", className)}>
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2.5 first:pl-0 last:pr-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-zinc-100 [&>tr:last-child]:border-0 [&>tr:nth-child(even)]:bg-zinc-50/60 [&>tr:hover]:bg-brand-tint/40 [&_td]:px-3 [&_td]:py-3 [&_td:first-child]:pl-0 [&_td:last-child]:pr-0">
          {children}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Badge ----------

const BADGE_TONES: Record<BadgeTone, string> = {
  amber: "bg-amber-100 text-amber-800",
  emerald: "bg-emerald-100 text-emerald-800",
  sky: "bg-sky-100 text-sky-800",
  teal: "bg-brand-tint text-brand-dark",
  red: "bg-red-100 text-red-700",
  zinc: "bg-zinc-100 text-zinc-600",
  orange: "bg-orange-100 text-orange-700",
};

export function Badge({ tone = "zinc", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        BADGE_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

export function BookingStatusBadge({ status }: { status: string }) {
  const meta = BOOKING_STATUS[status as BookingStatus];
  if (!meta) return <Badge>{status}</Badge>;
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function PayoutStatusBadge({ status }: { status: string }) {
  const meta = PAYOUT_STATUS[status as PayoutStatus];
  if (!meta) return <Badge>{status}</Badge>;
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

// ---------- Button ----------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-dark active:bg-brand-dark disabled:bg-zinc-300",
  secondary:
    "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 active:bg-zinc-100 disabled:text-zinc-400",
  ghost: "text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200 disabled:text-zinc-300",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-zinc-300",
};

export function Button({
  variant = "primary",
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed",
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

// ---------- Modal (<dialog>) ----------

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // клик по подложке закрывает
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-0 shadow-xl backdrop:bg-zinc-900/45"
    >
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
      {footer && (
        <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-4">{footer}</div>
      )}
    </dialog>
  );
}

// ---------- Input / Select ----------

const FIELD_CLASSES =
  "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-zinc-50 disabled:text-zinc-400";

export function Input({
  label,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const field = <input className={cx(FIELD_CLASSES, className)} {...rest} />;
  if (!label) return field;
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-zinc-700">{label}</span>
      {field}
    </label>
  );
}

export function Select({
  label,
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  const field = (
    <select className={cx(FIELD_CLASSES, "pr-8", className)} {...rest}>
      {children}
    </select>
  );
  if (!label) return field;
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-zinc-700">{label}</span>
      {field}
    </label>
  );
}

export function Textarea({
  label,
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  const field = (
    <textarea className={cx(FIELD_CLASSES, "min-h-24 resize-y", className)} {...rest} />
  );
  if (!label) return field;
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-zinc-700">{label}</span>
      {field}
    </label>
  );
}

// ---------- Pagination ----------

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number; // 0-based
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  if (total <= pageSize) return null;
  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);
  const lastPage = Math.ceil(total / pageSize) - 1;
  return (
    <div className="flex items-center justify-between gap-3 pt-4">
      <span className="text-sm text-zinc-500">
        {from}–{to} из {total}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
          className="px-3 py-1.5"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Назад
        </Button>
        <Button
          variant="secondary"
          disabled={page >= lastPage}
          onClick={() => onPage(page + 1)}
          className="px-3 py-1.5"
        >
          Вперёд
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

// ---------- EmptyState ----------

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="rounded-2xl bg-zinc-100 p-3 text-zinc-400">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <div className="text-sm font-semibold text-zinc-700">{title}</div>
      {text && <p className="max-w-sm text-sm text-zinc-500">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ---------- Spinner / Skeleton ----------

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      className={cx("h-5 w-5 animate-spin text-brand", className)}
      aria-label="Загрузка"
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-lg bg-zinc-200/80", className)} />;
}

// ---------- Toast ----------

type Toast = { id: number; message: string; type: "success" | "error" };

const ToastContext = createContext<(message: string, type?: Toast["type"]) => void>(
  () => {},
);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-start gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-md"
          >
            {t.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
            )}
            <span className="text-zinc-800">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
