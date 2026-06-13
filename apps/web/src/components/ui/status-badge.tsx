import type { BookingStatus } from "@ustoz/shared";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

/** Booking status colors from the design system. */
const styles: Record<BookingStatus, string> = {
  pending_payment: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  in_progress: "bg-sky-100 text-sky-700",
  completed: "bg-brand-100 text-brand-700",
  cancelled_by_student: "bg-red-50 text-red-500",
  cancelled_by_teacher: "bg-red-50 text-red-500",
  no_show_student: "bg-orange-50 text-orange-600",
  no_show_teacher: "bg-orange-50 text-orange-600",
  expired: "bg-zinc-100 text-zinc-500",
};

export function StatusBadge({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  const t = useTranslations("Ui.status");
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
        styles[status],
        className,
      )}
    >
      {t(status)}
    </span>
  );
}
