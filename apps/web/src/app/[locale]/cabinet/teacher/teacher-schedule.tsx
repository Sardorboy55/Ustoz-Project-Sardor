"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarOff, Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@ustoz/shared";
import { createClient } from "@/lib/supabase/client";
import { formatDateWithYear } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCabinet } from "@/components/cabinet/cabinet-shell";

type Rule = { id: string; weekday: number; start_min: number; end_min: number };
type ExceptionRow = { id: string; date: string };

/** Display order Mon..Sun; DB stores 0=Sunday. */
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0] as const;

const minToTime = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** 30-minute steps over the whole day. */
const STEPS = Array.from({ length: 49 }, (_, i) => i * 30);

/** Localized weekday name for DB weekday (0=Sunday). 2026-06-07 is a Sunday. */
function weekdayName(weekday: number, locale: string): string {
  const d = new Date(Date.UTC(2026, 5, 7 + weekday, 12));
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "uz-UZ", {
    weekday: "long",
  }).format(d);
}

export function TeacherSchedule() {
  const t = useTranslations("Cabinet.teacher");
  const tCommon = useTranslations("Cabinet.common");
  const locale = useLocale() as Locale;
  const { userId } = useCabinet();

  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [rules, setRules] = useState<Rule[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionRow[]>([]);

  // add-window form
  const [weekday, setWeekday] = useState(1);
  const [startMin, setStartMin] = useState(9 * 60);
  const [endMin, setEndMin] = useState(18 * 60);
  const [addingRule, setAddingRule] = useState(false);
  const [ruleError, setRuleError] = useState(false);

  // add-exception form
  const [exceptionDate, setExceptionDate] = useState("");
  const [addingException, setAddingException] = useState(false);

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [rulesRes, excRes] = await Promise.all([
      supabase
        .from("availability_rules")
        .select("id, weekday, start_min, end_min")
        .eq("teacher_id", userId)
        .order("weekday", { ascending: true })
        .order("start_min", { ascending: true }),
      supabase
        .from("availability_exceptions")
        .select("id, date")
        .eq("teacher_id", userId)
        .gte("date", new Date().toISOString().slice(0, 10))
        .order("date", { ascending: true }),
    ]);
    if (rulesRes.error || excRes.error) {
      setPhase("error");
      return;
    }
    setRules((rulesRes.data ?? []) as Rule[]);
    setExceptions((excRes.data ?? []) as ExceptionRow[]);
    setPhase("ready");
  }, [userId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const addRule = async () => {
    if (startMin >= endMin) {
      setRuleError(true);
      return;
    }
    setAddingRule(true);
    setRuleError(false);
    const supabase = createClient();
    const { error } = await supabase.from("availability_rules").insert({
      teacher_id: userId,
      weekday,
      start_min: startMin,
      end_min: endMin,
    });
    setAddingRule(false);
    if (error) {
      setRuleError(true);
      return;
    }
    await load();
  };

  const deleteRule = async (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id)); // optimistic
    const supabase = createClient();
    const { error } = await supabase
      .from("availability_rules")
      .delete()
      .eq("id", id);
    if (error) await load();
  };

  const addException = async () => {
    if (!exceptionDate) return;
    setAddingException(true);
    const supabase = createClient();
    await supabase
      .from("availability_exceptions")
      .insert({ teacher_id: userId, date: exceptionDate });
    setAddingException(false);
    setExceptionDate("");
    await load();
  };

  const deleteException = async (id: string) => {
    setExceptions((prev) => prev.filter((e) => e.id !== id)); // optimistic
    const supabase = createClient();
    const { error } = await supabase
      .from("availability_exceptions")
      .delete()
      .eq("id", id);
    if (error) await load();
  };

  if (phase === "loading") {
    return (
      <div aria-busy="true" className="space-y-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (phase === "error") {
    return <ErrorState description={tCommon("loadError")} onRetry={() => void load()} />;
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h2 className="text-lg font-bold text-zinc-900">{t("scheduleTitle")}</h2>
        <p className="mt-0.5 text-sm text-zinc-500">{t("scheduleSubtitle")}</p>
      </div>

      {/* Add window */}
      <Card className="p-5">
        <p className="text-sm font-semibold text-zinc-800">{t("addWindow")}</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Select
            label={t("weekday")}
            value={String(weekday)}
            onChange={(e) => setWeekday(Number(e.target.value))}
            wrapperClassName="min-w-40 flex-1"
          >
            {WEEKDAYS.map((wd) => (
              <option key={wd} value={wd}>
                {weekdayName(wd, locale)}
              </option>
            ))}
          </Select>
          <Select
            label={t("from")}
            value={String(startMin)}
            onChange={(e) => setStartMin(Number(e.target.value))}
            wrapperClassName="w-28"
          >
            {STEPS.slice(0, -1).map((m) => (
              <option key={m} value={m}>
                {minToTime(m)}
              </option>
            ))}
          </Select>
          <Select
            label={t("to")}
            value={String(endMin)}
            onChange={(e) => setEndMin(Number(e.target.value))}
            wrapperClassName="w-28"
          >
            {STEPS.slice(1).map((m) => (
              <option key={m} value={m}>
                {minToTime(m)}
              </option>
            ))}
          </Select>
          <Button onClick={addRule} loading={addingRule} disabled={startMin >= endMin}>
            <Plus size={16} aria-hidden="true" />
            {t("windowAdd")}
          </Button>
        </div>
        {ruleError && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {t("scheduleError")}
          </p>
        )}
      </Card>

      {/* Weekly grid */}
      <Card className="divide-y divide-zinc-100 p-0">
        {WEEKDAYS.map((wd) => {
          const dayRules = rules.filter((r) => r.weekday === wd);
          return (
            <div key={wd} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <span className="w-28 shrink-0 text-sm font-semibold capitalize text-zinc-800">
                {weekdayName(wd, locale)}
              </span>
              {dayRules.length === 0 ? (
                <span className="text-sm text-zinc-400">{t("noWindows")}</span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {dayRules.map((r) => {
                    const label = `${minToTime(r.start_min)}–${minToTime(r.end_min)}`;
                    return (
                      <span
                        key={r.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pl-3 pr-1.5 text-sm font-medium text-brand-800"
                      >
                        {label}
                        <button
                          type="button"
                          aria-label={t("deleteAria", { label })}
                          onClick={() => void deleteRule(r.id)}
                          className="flex h-5 w-5 items-center justify-center rounded-full text-brand-600 outline-none transition-colors hover:bg-brand-100 hover:text-brand-800 focus-visible:ring-2 focus-visible:ring-brand-600"
                        >
                          <X size={13} aria-hidden="true" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </Card>

      {/* Exceptions */}
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <CalendarOff size={17} className="text-zinc-400" aria-hidden="true" />
          <p className="text-sm font-semibold text-zinc-800">{t("exceptionsTitle")}</p>
        </div>
        <p className="mt-1 text-sm text-zinc-500">{t("exceptionsBody")}</p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            type="date"
            min={todayKey}
            value={exceptionDate}
            aria-label={t("exceptionAdd")}
            onChange={(e) => setExceptionDate(e.target.value)}
            className="rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
          />
          <Button
            variant="secondary"
            onClick={addException}
            loading={addingException}
            disabled={!exceptionDate}
          >
            <Plus size={16} aria-hidden="true" />
            {t("exceptionAdd")}
          </Button>
        </div>

        {exceptions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {exceptions.map((e) => {
              const label = formatDateWithYear(new Date(`${e.date}T12:00:00Z`), locale);
              return (
                <span
                  key={e.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 py-1 pl-3 pr-1.5 text-sm font-medium text-zinc-700"
                >
                  {label}
                  <button
                    type="button"
                    aria-label={t("deleteAria", { label })}
                    onClick={() => void deleteException(e.id)}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-500 outline-none transition-colors hover:bg-zinc-200 hover:text-zinc-800 focus-visible:ring-2 focus-visible:ring-brand-600"
                  >
                    <X size={13} aria-hidden="true" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
