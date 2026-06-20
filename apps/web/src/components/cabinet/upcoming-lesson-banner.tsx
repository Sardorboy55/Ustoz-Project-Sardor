"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, X } from "lucide-react";
import { useLocale } from "next-intl";
import type { BookingStatus, Locale } from "@ustoz/shared";
import { ButtonLink } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { formatTime } from "@/lib/datetime";
import { JoinLessonButton } from "@/components/booking/join-lesson-button";

// За сколько до начала показываем кнопку «Войти».
const JOIN_BEFORE_MS = 10 * 60_000;
// Урок остаётся активным ещё 2 часа после планового конца (затянулся / перезайти).
const ACTIVE_GRACE_MS = 2 * 60 * 60_000;
const DISMISS_KEY = "ibilim:lesson-banner-dismissed";

type Row = {
  id: string;
  status: BookingStatus;
  start_at: string;
  duration_min: number;
  teacher_subjects: { subjects: { name_uz: string; name_ru: string } | null } | null;
  teacher: {
    profiles: { full_name: string } | null;
  } | null;
};

const SELECT = `
  id, status, start_at, duration_min,
  teacher_subjects ( subjects ( name_uz, name_ru ) ),
  teacher:teacher_profiles!bookings_teacher_id_fkey (
    profiles!teacher_profiles_user_id_fkey ( full_name ) )
`;

function readDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/** Human countdown to the lesson start (ru/uz short units). */
function countdown(msLeft: number, locale: Locale): string {
  const live = locale === "ru" ? "Урок идёт сейчас" : "Dars hozir ketmoqda";
  if (msLeft <= 0) return live;
  const totalMin = Math.floor(msLeft / 60_000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const secs = Math.floor((msLeft % 60_000) / 1000);
  const u =
    locale === "ru"
      ? { d: "д", h: "ч", m: "мин", s: "сек" }
      : { d: "kun", h: "soat", m: "daq", s: "son" };
  if (days > 0) return `${days} ${u.d} ${hours} ${u.h}`;
  if (hours > 0) return `${hours} ${u.h} ${mins} ${u.m}`;
  if (mins > 0) return `${mins} ${u.m} ${secs} ${u.s}`;
  return `${secs} ${u.s}`;
}

/**
 * Persistent banner with the student's next lesson + a live countdown to its
 * start. Shows a "pay" CTA for unpaid bookings (so they don't forget) and a
 * "join" button once the room opens. Dismissable per lesson (localStorage).
 */
export function UpcomingLessonBanner({
  userId,
  studentName,
}: {
  userId: string;
  studentName: string;
}) {
  const locale = useLocale() as Locale;

  const [row, setRow] = useState<Row | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [dismissed, setDismissed] = useState<string[]>(() => readDismissed());
  const [hidden, setHidden] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("bookings")
      .select(SELECT)
      .eq("student_id", userId)
      .in("status", ["pending_payment", "paid", "in_progress"])
      .order("start_at", { ascending: true })
      .limit(8);
    const nowMs = Date.now();
    const next = ((data ?? []) as unknown as Row[]).find(
      (r) =>
        new Date(r.start_at).getTime() +
          r.duration_min * 60_000 +
          ACTIVE_GRACE_MS >
        nowMs,
    );
    setRow(next ?? null);
  }, [userId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const subject = useMemo(() => {
    const s = row?.teacher_subjects?.subjects ?? null;
    return s ? (locale === "ru" ? s.name_ru : s.name_uz) : "";
  }, [row, locale]);

  if (!row || hidden || dismissed.includes(row.id)) return null;

  const startMs = new Date(row.start_at).getTime();
  const msLeft = startMs - now;
  const canJoin = now >= startMs - JOIN_BEFORE_MS;
  const teacherName = row.teacher?.profiles?.full_name ?? "";

  const dismiss = () => {
    const next = [...new Set([...dismissed, row.id])];
    setDismissed(next);
    setHidden(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative mb-5 overflow-hidden rounded-2xl border border-brand-200 bg-brand-50/70 p-4 sm:p-5">
      <button
        type="button"
        onClick={dismiss}
        aria-label={locale === "ru" ? "Скрыть" : "Yashirish"}
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white hover:text-zinc-700"
      >
        <X size={16} aria-hidden="true" />
      </button>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pr-8">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
          <CalendarClock size={22} aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
            {locale === "ru" ? "Ваш ближайший урок" : "Yaqin darsingiz"}
          </p>
          <p className="mt-0.5 truncate font-bold text-zinc-900">
            {subject}
            {teacherName && (
              <span className="font-medium text-zinc-500"> · {teacherName}</span>
            )}
          </p>
          <p className="mt-0.5 text-sm text-zinc-600">
            {locale === "ru" ? "Начало в " : "Boshlanish "}
            {formatTime(new Date(startMs), locale)} ·{" "}
            <span className="font-semibold text-brand-700">
              {msLeft > 0
                ? `${locale === "ru" ? "через" : ""} ${countdown(msLeft, locale)}`
                : countdown(msLeft, locale)}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {row.status === "pending_payment" ? (
            <ButtonLink href={`/booking/${row.id}`} size="sm">
              {locale === "ru" ? "Оплатить урок" : "Darsni to'lash"}
            </ButtonLink>
          ) : canJoin ? (
            <JoinLessonButton
              bookingId={row.id}
              startAtMs={startMs}
              displayName={studentName || (locale === "ru" ? "Ученик" : "O'quvchi")}
            />
          ) : (
            <ButtonLink href={`/booking/${row.id}`} variant="secondary" size="sm">
              {locale === "ru" ? "Подробнее" : "Batafsil"}
            </ButtonLink>
          )}
        </div>
      </div>
    </div>
  );
}
