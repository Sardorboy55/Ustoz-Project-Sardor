"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatUzs, type Locale } from "@ustoz/shared";
import { createClient } from "@/lib/supabase/client";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { localizeContent } from "@/lib/content-i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { useCabinet } from "@/components/cabinet/cabinet-shell";

type MyRow = {
  id: string;
  subject_id: string;
  price_30: number | null;
  price_60: number;
  price_90: number | null;
  trial_free_enabled: boolean;
  pkg5_discount_pct: number;
  pkg10_discount_pct: number;
  pkg20_discount_pct: number;
  subjects: { name_uz: string; name_ru: string } | null;
};

/** tiyin → editable UZS string ("" for null). */
const toUzsStr = (tiyin: number | null) =>
  tiyin === null || tiyin === undefined ? "" : String(Math.round(tiyin / 100));
/** editable UZS string → tiyin (null when empty/zero). */
const toTiyin = (s: string): number | null => {
  const n = Number(s.replace(/\D/g, ""));
  return n > 0 ? n * 100 : null;
};

export function TeacherSubjects() {
  const t = useTranslations("Cabinet.teacher");
  const tCommon = useTranslations("Cabinet.common");
  const locale = useLocale() as Locale;
  const { userId } = useCabinet();

  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [mine, setMine] = useState<MyRow[]>([]);

  const name = (s: { name_uz: string; name_ru: string } | null) =>
    s ? localizeContent(locale, s.name_uz, s.name_ru) : "";

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("teacher_subjects")
      .select(
        "id, subject_id, price_30, price_60, price_90, trial_free_enabled, pkg5_discount_pct, pkg10_discount_pct, pkg20_discount_pct, subjects(name_uz, name_ru)",
      )
      .eq("teacher_id", userId);
    if (error) {
      setPhase("error");
      return;
    }
    setMine((data ?? []) as unknown as MyRow[]);
    setPhase("ready");
  }, [userId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  if (phase === "loading") {
    return (
      <div aria-busy="true" className="space-y-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (phase === "error") {
    return <ErrorState description={tCommon("loadError")} onRetry={() => void load()} />;
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h2 className="text-lg font-bold text-zinc-900">{t("subjectsTitle")}</h2>
        <p className="mt-0.5 text-sm text-zinc-500">{t("subjectsSubtitle")}</p>
      </div>

      {/* Add a lesson on a dedicated page */}
      <ButtonLink
        href="/cabinet/teacher/subjects/new"
        size="lg"
        className="w-full justify-center"
      >
        <Plus size={18} aria-hidden="true" />
        Добавить урок
      </ButtonLink>

      {/* My subjects */}
      {mine.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t("noSubjects")}
          description={t("noSubjectsBody")}
        />
      ) : (
        mine.map((row) => (
          <SubjectRow
            key={row.id}
            row={row}
            title={name(row.subjects)}
            locale={locale}
            onChanged={load}
          />
        ))
      )}
    </div>
  );
}

function SubjectRow({
  row,
  title,
  locale,
  onChanged,
}: {
  row: MyRow;
  title: string;
  locale: Locale;
  onChanged: () => Promise<void>;
}) {
  const t = useTranslations("Cabinet.teacher");
  const pctStr = (n: number) => (n > 0 ? String(n) : "");
  // DB caps discounts at 90% (check constraint).
  const pctInt = (s: string) => Math.min(90, Number(s.replace(/\D/g, "")) || 0);

  const [p30, setP30] = useState(toUzsStr(row.price_30));
  const [p60, setP60] = useState(toUzsStr(row.price_60));
  const [p90, setP90] = useState(toUzsStr(row.price_90));
  const [pkg5, setPkg5] = useState(pctStr(row.pkg5_discount_pct));
  const [pkg10, setPkg10] = useState(pctStr(row.pkg10_discount_pct));
  const [pkg20, setPkg20] = useState(pctStr(row.pkg20_discount_pct));
  const [trial, setTrial] = useState(row.trial_free_enabled);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const [editing, setEditing] = useState(false);

  const dirty =
    p30 !== toUzsStr(row.price_30) ||
    p60 !== toUzsStr(row.price_60) ||
    p90 !== toUzsStr(row.price_90) ||
    pctInt(pkg5) !== row.pkg5_discount_pct ||
    pctInt(pkg10) !== row.pkg10_discount_pct ||
    pctInt(pkg20) !== row.pkg20_discount_pct ||
    trial !== row.trial_free_enabled;

  const num = (set: (v: string) => void) => (e: { target: { value: string } }) => {
    set(e.target.value.replace(/\D/g, ""));
    setState("idle");
  };

  const save = async () => {
    const price60 = toTiyin(p60);
    if (!price60) return;
    setSaving(true);
    setState("idle");
    const supabase = createClient();
    const { error } = await supabase
      .from("teacher_subjects")
      .update({
        price_30: toTiyin(p30),
        price_60: price60,
        price_90: toTiyin(p90),
        pkg5_discount_pct: pctInt(pkg5),
        pkg10_discount_pct: pctInt(pkg10),
        pkg20_discount_pct: pctInt(pkg20),
        trial_free_enabled: trial,
      })
      .eq("id", row.id);
    setSaving(false);
    if (error) {
      setState("error");
      return;
    }
    setState("saved");
    await onChanged();
    setEditing(false);
  };

  const remove = async () => {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("teacher_subjects")
      .delete()
      .eq("id", row.id);
    if (error) {
      setDeleting(false);
      setState("error");
      return;
    }
    await onChanged();
  };

  const cancel = () => {
    setP30(toUzsStr(row.price_30));
    setP60(toUzsStr(row.price_60));
    setP90(toUzsStr(row.price_90));
    setPkg5(pctStr(row.pkg5_discount_pct));
    setPkg10(pctStr(row.pkg10_discount_pct));
    setPkg20(pctStr(row.pkg20_discount_pct));
    setTrial(row.trial_free_enabled);
    setState("idle");
    setEditing(false);
  };

  const preview = (
    <LessonPreviewCard
      subjectName={title}
      p30={toTiyin(p30)}
      p60={toTiyin(p60)}
      p90={toTiyin(p90)}
      trial={trial}
      pkg5={pctInt(pkg5)}
      pkg10={pctInt(pkg10)}
      pkg20={pctInt(pkg20)}
      locale={locale}
    />
  );

  return (
    <>
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold text-zinc-900">{title}</p>
        <div className="flex items-center gap-1.5">
          {!editing && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Pencil size={15} aria-hidden="true" />
              Изменить
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setState("idle");
              setConfirmDel(true);
            }}
            className="border border-red-300 text-red-600 hover:border-red-400 hover:bg-red-50 active:bg-red-100"
          >
            <Trash2 size={15} aria-hidden="true" />
            {t("subjectDelete")}
          </Button>
        </div>
      </div>

      {editing ? (
        <>
          <p className="mt-3 text-sm font-medium text-zinc-700">
            Цены по длительности
          </p>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input label={t("price30")} helper={t("optional")} inputMode="numeric" value={p30} onChange={num(setP30)} />
            <Input label={t("price60")} inputMode="numeric" value={p60} onChange={num(setP60)} />
            <Input label={t("price90")} helper={t("optional")} inputMode="numeric" value={p90} onChange={num(setP90)} />
          </div>

          <p className="mt-4 text-sm font-medium text-zinc-700">
            Скидки на пакеты{" "}
            <span className="font-normal text-zinc-400">(%, необязательно)</span>
          </p>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input label="5 уроков" suffix="%" inputMode="numeric" value={pkg5} onChange={num(setPkg5)} />
            <Input label="10 уроков" suffix="%" inputMode="numeric" value={pkg10} onChange={num(setPkg10)} />
            <Input label="20 уроков" suffix="%" inputMode="numeric" value={pkg20} onChange={num(setPkg20)} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={trial}
                onChange={(e) => {
                  setTrial(e.target.checked);
                  setState("idle");
                }}
                className="h-4 w-4 rounded border-zinc-300 accent-brand-600"
              />
              {t("trialToggle")}
            </label>
            <div className="ml-auto flex items-center gap-3">
              {state === "error" && (
                <span role="alert" className="text-sm text-red-600">
                  {t("subjectError")}
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={cancel}>
                Отмена
              </Button>
              <Button size="sm" loading={saving} disabled={!dirty || !toTiyin(p60)} onClick={save}>
                {t("save")}
              </Button>
            </div>
          </div>

          {/* Live preview — how the lesson appears to students */}
          <div className="mt-4 border-t border-zinc-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Так увидят ученики
            </p>
            <div className="mt-2">{preview}</div>
          </div>
        </>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["30", p30],
                ["60", p60],
                ["90", p90],
              ] as const
            ).map(([min, v]) => {
              const tiyin = toTiyin(v);
              return tiyin ? (
                <span
                  key={min}
                  className="rounded-lg bg-zinc-50 px-3 py-1.5 text-sm text-zinc-500"
                >
                  {min} мин{" "}
                  <span className="font-bold text-zinc-900">
                    {formatUzs(tiyin, locale)} сум
                  </span>
                </span>
              ) : null;
            })}
          </div>
          {(trial ||
            pctInt(pkg5) > 0 ||
            pctInt(pkg10) > 0 ||
            pctInt(pkg20) > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
              {trial && (
                <span className="font-medium text-brand-700">
                  Бесплатный пробный 20 мин
                </span>
              )}
              {(pctInt(pkg5) > 0 ||
                pctInt(pkg10) > 0 ||
                pctInt(pkg20) > 0) && (
                <span className="text-zinc-400">Пакеты:</span>
              )}
              {(
                [
                  ["5", pkg5],
                  ["10", pkg10],
                  ["20", pkg20],
                ] as const
              ).map(([n, v]) => {
                const pct = pctInt(v);
                return pct > 0 ? (
                  <span
                    key={n}
                    className="rounded-full bg-brand-50 px-2.5 py-1 font-medium text-brand-700"
                  >
                    {n} уроков −{pct}%
                  </span>
                ) : null;
              })}
            </div>
          )}
        </>
      )}
    </Card>

      <Modal
        open={confirmDel}
        onClose={() => {
          if (!deleting) setConfirmDel(false);
        }}
        title={t("subjectDelete")}
        size="lg"
      >
        <p className="text-sm leading-relaxed text-zinc-600">
          {t("subjectDeleteWarn")}
        </p>
        {state === "error" && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {t("subjectError")}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="ghost"
            disabled={deleting}
            onClick={() => setConfirmDel(false)}
          >
            {t("subjectDeleteNo")}
          </Button>
          <Button variant="danger" loading={deleting} onClick={remove}>
            {!deleting && <Trash2 size={16} aria-hidden="true" />}
            {t("subjectDeleteYes")}
          </Button>
        </div>
      </Modal>
    </>
  );
}

/** Read-only mirror of the catalog lesson card, fed by the live form values. */
function LessonPreviewCard({
  subjectName,
  p30,
  p60,
  p90,
  trial,
  pkg5,
  pkg10,
  pkg20,
  locale,
}: {
  subjectName: string;
  p30: number | null;
  p60: number | null;
  p90: number | null;
  trial: boolean;
  pkg5: number;
  pkg10: number;
  pkg20: number;
  locale: Locale;
}) {
  const durations = [
    { min: 30, tiyin: p30 },
    { min: 60, tiyin: p60 },
    { min: 90, tiyin: p90 },
  ].filter((d): d is { min: number; tiyin: number } => (d.tiyin ?? 0) > 0);
  const pkgs = [
    { n: 5, pct: pkg5 },
    { n: 10, pct: pkg10 },
    { n: 20, pct: pkg20 },
  ].filter((p) => p.pct > 0);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-base font-bold text-zinc-900">
        {subjectName || "Предмет"}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {durations.length === 0 ? (
          <span className="text-sm text-zinc-400">Укажите цену за 60 мин</span>
        ) : (
          durations.map((d) => (
            <span
              key={d.min}
              className="rounded-lg bg-zinc-50 px-3 py-1.5 text-sm text-zinc-500"
            >
              {d.min} мин{" "}
              <span className="font-bold text-zinc-900">
                {formatUzs(d.tiyin, locale)} сум
              </span>
            </span>
          ))
        )}
      </div>
      {(trial || pkgs.length > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          {trial && (
            <span className="font-medium text-brand-700">
              Бесплатный пробный 20 мин
            </span>
          )}
          {pkgs.length > 0 && <span className="text-zinc-400">Пакеты:</span>}
          {pkgs.map((p) => (
            <span
              key={p.n}
              className="rounded-full bg-brand-50 px-2.5 py-1 font-medium text-brand-700"
            >
              {p.n} уроков −{p.pct}%
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
