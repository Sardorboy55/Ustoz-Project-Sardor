// Форматирование денег, дат и статусов. Деньги в БД — тийины (integer).
// Отображение: ÷100, "80 000 сум". Часовой пояс — Asia/Tashkent.

const sumFormatter = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

/** Тийины → "80 000 сум" */
export function formatSum(tiyin: number | null | undefined): string {
  if (tiyin == null) return "—";
  return `${sumFormatter.format(Math.round(tiyin / 100))} сум`;
}

const dateTimeFmt = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Asia/Tashkent",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFmt = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Asia/Tashkent",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** ISO → "12.06.2026, 14:30" (Ташкент) */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return dateTimeFmt.format(d);
}

/** ISO → "12.06.2026" (Ташкент) */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return dateFmt.format(d);
}

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC+5, без DST

/** Границы текущего дня по Ташкенту, в ISO (UTC). */
export function tashkentDayRange(): { from: string; to: string } {
  const nowTk = new Date(Date.now() + TASHKENT_OFFSET_MS);
  const start = Date.UTC(nowTk.getUTCFullYear(), nowTk.getUTCMonth(), nowTk.getUTCDate());
  return {
    from: new Date(start - TASHKENT_OFFSET_MS).toISOString(),
    to: new Date(start + 24 * 60 * 60 * 1000 - TASHKENT_OFFSET_MS).toISOString(),
  };
}

/** Границы текущего месяца по Ташкенту, в ISO (UTC). */
export function tashkentMonthRange(): { from: string; to: string } {
  const nowTk = new Date(Date.now() + TASHKENT_OFFSET_MS);
  const start = Date.UTC(nowTk.getUTCFullYear(), nowTk.getUTCMonth(), 1);
  const end = Date.UTC(nowTk.getUTCFullYear(), nowTk.getUTCMonth() + 1, 1);
  return {
    from: new Date(start - TASHKENT_OFFSET_MS).toISOString(),
    to: new Date(end - TASHKENT_OFFSET_MS).toISOString(),
  };
}

/**
 * Готовит пользовательский ввод к подстановке в ilike-паттерн внутри .or():
 * выкидывает символы PostgREST-синтаксиса (запятые, скобки) и экранирует
 * спецсимволы LIKE (%, _, \).
 */
export function ilikeSafe(raw: string): string {
  return raw
    .replace(/[,()]/g, " ")
    .replace(/[\\%_]/g, (m) => `\\${m}`)
    .trim();
}

// ---------- Статусы ----------

export type BadgeTone =
  | "amber"
  | "emerald"
  | "sky"
  | "teal"
  | "red"
  | "zinc"
  | "orange";

export type BookingStatus =
  | "pending_payment"
  | "paid"
  | "in_progress"
  | "completed"
  | "cancelled_by_student"
  | "cancelled_by_teacher"
  | "no_show_student"
  | "no_show_teacher"
  | "expired";

export const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: BadgeTone }> = {
  pending_payment: { label: "Ожидает оплаты", tone: "amber" },
  paid: { label: "Оплачено", tone: "emerald" },
  in_progress: { label: "Идёт урок", tone: "sky" },
  completed: { label: "Завершено", tone: "teal" },
  cancelled_by_student: { label: "Отменено учеником", tone: "red" },
  cancelled_by_teacher: { label: "Отменено преподавателем", tone: "red" },
  no_show_student: { label: "Ученик не пришёл", tone: "orange" },
  no_show_teacher: { label: "Преподаватель не пришёл", tone: "orange" },
  expired: { label: "Истекло", tone: "zinc" },
};

export type PaymentStatus = "created" | "pending" | "succeeded" | "failed" | "refunded";

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: BadgeTone }> = {
  created: { label: "Создан", tone: "zinc" },
  pending: { label: "В обработке", tone: "amber" },
  succeeded: { label: "Успешно", tone: "emerald" },
  failed: { label: "Ошибка", tone: "red" },
  refunded: { label: "Возврат", tone: "sky" },
};

export type PayoutStatus = "pending" | "approved" | "paid" | "rejected";

export const PAYOUT_STATUS: Record<PayoutStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: "В очереди", tone: "amber" },
  approved: { label: "Одобрено", tone: "sky" },
  paid: { label: "Выплачено", tone: "emerald" },
  rejected: { label: "Отклонено", tone: "red" },
};
