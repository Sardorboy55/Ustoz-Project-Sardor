"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Eye, GraduationCap, TrendingUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { BookingStatus, Locale } from "@ustoz/shared";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  formatMonthShort,
  formatTime,
  formatWeekdayShort,
  tashkentDayNumber,
  tashkentMonthStartUtc,
} from "@/lib/datetime";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Price } from "@/components/ui/price";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { useCabinet } from "@/components/cabinet/cabinet-shell";

type UpcomingRow = {
  id: string;
  status: BookingStatus;
  start_at: string;
  duration_min: number;
  price: number;
  teacher_subjects: { subjects: { name_uz: string; name_ru: string } | null } | null;
  student: { full_name: string; avatar_url: string | null } | null;
};

const SELECT = `
  id, status, start_at, duration_min, price,
  teacher_subjects ( subjects ( name_uz, name_ru ) ),
  student:profiles!bookings_student_id_fkey ( full_name, avatar_url )
`;

export function TeacherDashboard() {
  const t = useTranslations("Cabinet.teacher");
  const tCommon = useTranslations("Cabinet.common");
  const locale = useLocale() as Locale;
  const { userId } = useCabinet();

  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [upcoming, setUpcoming] = useState<UpcomingRow[]>([]);
  const [incomeMonth, setIncomeMonth] = useState(0);
  const [lessonsDone, setLessonsDone] = useState(0);

  const load = useCallback(async () => {
    const supabase = createClient();
    const now = new Date();
    const monthStart = tashkentMonthStartUtc(now);
    const [upRes, incomeRes, tpRes] = await Promise.all([
      supabase
        .from("bookings")
        .select(SELECT)
        .eq("teacher_id", userId)
        .in("status", ["pending_payment", "paid", "in_progress"])
        // Окно −6ч: чтобы уже идущий урок (start_at в прошлом) не исчезал —
        // ниже отфильтруем по реальному концу урока.
        .gte("start_at", new Date(now.getTime() - 6 * 3_600_000).toISOString())
        .order("start_at", { ascending: true })
        .limit(10),
      supabase
        .from("wallet_transactions")
        .select("amount")
        .eq("teacher_id", userId)
        .eq("type", "lesson_income")
        .gte("created_at", monthStart),
      supabase
        .from("teacher_profiles")
        .select("lessons_done")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    if (upRes.error || incomeRes.error || tpRes.error) {
      setPhase("error");
      return;
    }
    const nowMs = now.getTime();
    setUpcoming(
      ((upRes.data ?? []) as unknown as UpcomingRow[])
        .filter(
          (r) =>
            new Date(r.start_at).getTime() + r.duration_min * 60_000 > nowMs,
        )
        .slice(0, 5),
    );
    setIncomeMonth(
      (incomeRes.data ?? []).reduce(
        (sum, r) => sum + ((r as { amount: number }).amount ?? 0),
        0,
      ),
    );
    setLessonsDone(tpRes.data?.lessons_done ?? 0);
    setPhase("ready");
  }, [userId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  if (phase === "loading") {
    return (
      <div aria-busy="true" className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (phase === "error") {
    return <ErrorState description={tCommon("loadError")} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-zinc-400">
            <TrendingUp size={16} aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              {t("incomeMonth")}
            </span>
          </div>
          <Price tiyin={incomeMonth} className="mt-2 block text-2xl font-bold" />
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-zinc-400">
            <GraduationCap size={16} aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              {t("lessonsDone")}
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-zinc-900">{lessonsDone}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-zinc-400">
            <Eye size={16} aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              {t("views")}
            </span>
          </div>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-zinc-300">
            —<Badge variant="neutral">{t("soon")}</Badge>
          </p>
        </Card>
      </div>

      {/* Upcoming lessons */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          {t("upcomingTitle")}
        </h2>
        <div className="mt-3">
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={t("noUpcoming")}
              description={t("noUpcomingBody")}
            />
          ) : (
            <ul className="space-y-2">
              {upcoming.map((row) => {
                const start = new Date(row.start_at);
                const end = new Date(start.getTime() + row.duration_min * 60_000);
                const subjectRow = row.teacher_subjects?.subjects ?? null;
                const subject = subjectRow
                  ? locale === "ru"
                    ? subjectRow.name_ru
                    : subjectRow.name_uz
                  : "";
                const studentName = row.student?.full_name ?? "";
                return (
                  <li key={row.id}>
                   <Link
                    href={`/booking/${row.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm"
                   >
                    <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 py-2 text-brand-800">
                      <span className="text-[11px] font-semibold uppercase leading-none">
                        {formatWeekdayShort(start, locale)}
                      </span>
                      <span className="mt-1 text-lg font-bold leading-none">
                        {tashkentDayNumber(start)}
                      </span>
                      <span className="mt-1 text-[11px] font-medium uppercase leading-none">
                        {formatMonthShort(start, locale)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-zinc-900">{subject}</p>
                      <p className="text-sm text-zinc-500">
                        {formatTime(start, locale)}–{formatTime(end, locale)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-700">
                      <Avatar
                        src={row.student?.avatar_url}
                        name={studentName}
                        size="sm"
                      />
                      <span className="max-w-32 truncate">{studentName}</span>
                    </div>
                    <StatusBadge status={row.status} />
                   </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
