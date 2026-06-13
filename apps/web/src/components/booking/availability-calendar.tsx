"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarX2, ChevronLeft, ChevronRight, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import {
  addDays,
  formatDayMonth,
  formatTime,
  formatWeekdayShort,
  tashkentDateKey,
  tashkentDayNumber,
} from "@/lib/datetime";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

const DAYS_TOTAL = 14;
const WEEK = 7;

/**
 * Two-week availability picker: a 7-day strip with week arrows and a slot
 * grid fed by the public get_free_slots RPC. All times render in
 * Asia/Tashkent; taken slots simply never come back from the RPC.
 */
export function AvailabilityCalendar({
  teacherId,
  durationMin,
  value,
  onSelect,
  refreshKey = 0,
}: {
  teacherId: string;
  durationMin: number;
  /** Selected slot — ISO string as returned by the RPC. */
  value: string | null;
  onSelect: (slotIso: string) => void;
  /** Bump to force a slot refetch (e.g. after SLOT_TAKEN). */
  refreshKey?: number;
}) {
  const locale = useLocale();
  const t = useTranslations("Booking.widget");

  // Capture "now" once per mount: a stable 14-day window.
  const [windowStart] = useState(() => new Date());
  const days = useMemo(
    () => Array.from({ length: DAYS_TOTAL }, (_, i) => addDays(windowStart, i)),
    [windowStart],
  );

  const [week, setWeek] = useState(0);
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  // Loading/failure are derived from the last settled request vs the current
  // request key — no synchronous setState inside the effect body.
  const fetchKey = `${teacherId}|${durationMin}|${refreshKey}|${reload}`;
  const [result, setResult] = useState<{
    key: string;
    slots: string[];
    failed: boolean;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    supabase
      .rpc("get_free_slots", {
        p_teacher_id: teacherId,
        p_from: tashkentDateKey(days[0]),
        p_to: tashkentDateKey(days[DAYS_TOTAL - 1]),
        p_duration_min: durationMin,
      })
      .then(({ data, error }) => {
        if (!mounted) return;
        setResult({
          key: fetchKey,
          slots: error
            ? []
            : ((data ?? []) as Array<{ slot_start: string }>).map(
                (r) => r.slot_start,
              ),
          failed: Boolean(error),
        });
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey]);

  const loading = result?.key !== fetchKey;
  const failed = !loading && Boolean(result?.failed);
  const slots = useMemo(
    () => (!loading && !failed ? (result?.slots ?? []) : null),
    [loading, failed, result],
  );

  /** Slots grouped by Tashkent calendar day, sorted within the day. */
  const byDay = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const iso of slots ?? []) {
      const key = tashkentDateKey(new Date(iso));
      const list = map.get(key);
      if (list) list.push(iso);
      else map.set(key, [iso]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    }
    return map;
  }, [slots]);

  const visibleDays = days.slice(week * WEEK, week * WEEK + WEEK);
  const visibleKeys = visibleDays.map((d) => tashkentDateKey(d));

  // Active day is derived: the user's pick when still valid for this week,
  // otherwise the first visible day that has slots.
  const activeDayKey =
    dayKey && visibleKeys.includes(dayKey) && byDay.has(dayKey)
      ? dayKey
      : (visibleKeys.find((k) => byDay.has(k)) ?? null);

  if (failed) {
    return (
      <ErrorState
        description={t("slotsError")}
        onRetry={() => setReload((x) => x + 1)}
        className="py-10"
      />
    );
  }

  if (loading) {
    return (
      <div aria-hidden="true" className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-5 w-44" />
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-10 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const totalEmpty = byDay.size === 0;
  if (totalEmpty) {
    return (
      <EmptyState
        icon={CalendarX2}
        title={t("noSlots")}
        description={t("noSlotsHint")}
        className="py-10"
      />
    );
  }

  const weekHasSlots = visibleKeys.some((k) => byDay.has(k));
  const daySlots = activeDayKey ? (byDay.get(activeDayKey) ?? []) : [];

  return (
    <div>
      {/* Week navigation + timezone note */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setWeek(0)}
            disabled={week === 0}
            aria-label={t("prevWeek")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-300"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <span className="min-w-36 text-center text-sm font-semibold text-zinc-800">
            {formatDayMonth(visibleDays[0], locale)} –{" "}
            {formatDayMonth(visibleDays[WEEK - 1], locale)}
          </span>
          <button
            type="button"
            onClick={() => setWeek(1)}
            disabled={week === 1}
            aria-label={t("nextWeek")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-300"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
          <Globe size={14} aria-hidden="true" />
          {t("timezone")}
        </span>
      </div>

      {/* Day strip */}
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {visibleDays.map((d) => {
          const key = tashkentDateKey(d);
          const has = byDay.has(key);
          const active = key === activeDayKey;
          return (
            <button
              key={key}
              type="button"
              disabled={!has}
              onClick={() => setDayKey(key)}
              aria-pressed={active}
              className={cn(
                "flex flex-col items-center rounded-xl border px-1 py-2 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-600",
                active
                  ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                  : has
                    ? "border-zinc-200 bg-white text-zinc-800 hover:border-brand-300 hover:bg-brand-50"
                    : "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300",
              )}
            >
              <span className="text-[11px] font-medium uppercase">
                {formatWeekdayShort(d, locale)}
              </span>
              <span className="mt-0.5 text-base font-bold leading-none">
                {tashkentDayNumber(d)}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "mt-1 h-1 w-1 rounded-full",
                  has ? (active ? "bg-white" : "bg-brand-500") : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>

      {/* Slots of the selected day */}
      <div className="mt-4">
        {!weekHasSlots ? (
          <p className="rounded-xl bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
            {t("noSlotsWeek")}
          </p>
        ) : daySlots.length === 0 ? (
          <p className="rounded-xl bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
            {t("noSlotsDay")}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {daySlots.map((iso) => {
              const active = value === iso;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => onSelect(iso)}
                  aria-pressed={active}
                  className={cn(
                    "h-10 rounded-xl border text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-600",
                    active
                      ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                      : "border-zinc-200 bg-white text-zinc-800 hover:border-brand-400 hover:bg-brand-50",
                  )}
                >
                  {formatTime(new Date(iso), locale)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
