"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, Plus } from "lucide-react";
import { useLocale } from "next-intl";
import { type Locale } from "@ustoz/shared";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { localizeContent } from "@/lib/content-i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const onlyDigits = (s: string) => s.replace(/\D/g, "");
const toTiyin = (s: string): number | null => {
  const n = Number(onlyDigits(s));
  return n > 0 ? n * 100 : null;
};
const pctInt = (s: string) => Math.min(90, Number(onlyDigits(s)) || 0);

const TRIAL_DURATIONS = [
  { v: "15", label: "15 минут" },
  { v: "20", label: "20 минут" },
  { v: "30", label: "30 минут" },
  { v: "45", label: "45 минут" },
  { v: "60", label: "1 час" },
];

type Subject = { id: string; name_uz: string; name_ru: string };

/**
 * Dedicated "add a lesson" page (Russian-first): pick a subject, set prices,
 * package discounts and trial, then insert into teacher_subjects and go back to
 * the cabinet. The per-tier subject limit is enforced server-side (SUBJECT_LIMIT).
 */
export default function NewLessonPage() {
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [f, setF] = useState({
    subject_id: "",
    p30: "",
    p60: "",
    p90: "",
    pkg5: "",
    pkg10: "",
    pkg20: "",
    trial: false,
    trialDur: "20",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
    setF((p) => ({ ...p, [k]: v }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    queueMicrotask(async () => {
      const { data } = await supabase
        .from("subjects")
        .select("id, name_uz, name_ru")
        .eq("is_active", true)
        .order(locale === "ru" ? "name_ru" : "name_uz", { ascending: true });
      setSubjects((data ?? []) as Subject[]);
    });
  }, [locale]);

  const subjectName = (s: Subject) =>
    localizeContent(locale, s.name_uz, s.name_ru);

  const save = async () => {
    const price60 = toTiyin(f.p60);
    if (!f.subject_id || !price60) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      router.push("/auth?next=/cabinet/teacher");
      return;
    }
    const row = {
      teacher_id: user.id,
      subject_id: f.subject_id,
      price_30: toTiyin(f.p30),
      price_60: price60,
      price_90: toTiyin(f.p90),
      pkg5_discount_pct: pctInt(f.pkg5),
      pkg10_discount_pct: pctInt(f.pkg10),
      pkg20_discount_pct: pctInt(f.pkg20),
      trial_free_enabled: f.trial,
    };
    // trial_duration_min is added by a pending migration; the generated client
    // types don't include it yet, so cast past the excess-property check.
    let { error: insErr } = await supabase
      .from("teacher_subjects")
      .insert(
        f.trial
          ? ({ ...row, trial_duration_min: Number(f.trialDur) } as typeof row)
          : row,
      );
    if (insErr && insErr.message.includes("trial_duration_min")) {
      // Column not migrated yet — save the lesson without the custom trial length.
      ({ error: insErr } = await supabase.from("teacher_subjects").insert(row));
    }
    setSaving(false);
    if (insErr) {
      setError(
        insErr.message.includes("SUBJECT_LIMIT")
          ? "Достигнут лимит предметов для вашего тарифа (FREE — 1, PRO — до 5)."
          : "Не удалось добавить урок. Возможно, такой предмет уже добавлен.",
      );
      return;
    }
    router.push("/cabinet/teacher");
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/cabinet/teacher"
        className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
      >
        <ChevronLeft size={16} aria-hidden="true" />
        Назад в кабинет
      </Link>

      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
        Добавить урок
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Выберите предмет и укажите цены. Цена за 60 минут обязательна.
      </p>

      <Card className="mt-5 space-y-5 p-5">
        <Select
          label="Предмет"
          value={f.subject_id}
          onChange={(e) => set("subject_id", e.target.value)}
        >
          <option value="">— выберите предмет —</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {subjectName(s)}
            </option>
          ))}
        </Select>

        <div>
          <p className="text-sm font-medium text-zinc-700">
            Цены по длительности (сум)
          </p>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              label="30 мин"
              helper="необяз."
              inputMode="numeric"
              value={f.p30}
              onChange={(e) => set("p30", onlyDigits(e.target.value))}
            />
            <Input
              label="60 мин"
              inputMode="numeric"
              value={f.p60}
              onChange={(e) => set("p60", onlyDigits(e.target.value))}
            />
            <Input
              label="90 мин"
              helper="необяз."
              inputMode="numeric"
              value={f.p90}
              onChange={(e) => set("p90", onlyDigits(e.target.value))}
            />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-zinc-700">
            Скидки на пакеты{" "}
            <span className="font-normal text-zinc-400">(%, необяз., до 90)</span>
          </p>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              label="5 уроков"
              helper="%"
              inputMode="numeric"
              value={f.pkg5}
              onChange={(e) => set("pkg5", onlyDigits(e.target.value))}
            />
            <Input
              label="10 уроков"
              helper="%"
              inputMode="numeric"
              value={f.pkg10}
              onChange={(e) => set("pkg10", onlyDigits(e.target.value))}
            />
            <Input
              label="20 уроков"
              helper="%"
              inputMode="numeric"
              value={f.pkg20}
              onChange={(e) => set("pkg20", onlyDigits(e.target.value))}
            />
          </div>
        </div>

        <div>
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={f.trial}
              onChange={(e) => set("trial", e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 accent-brand-600"
            />
            Предлагать бесплатный пробный урок
          </label>
          {f.trial && (
            <div className="mt-3 max-w-52">
              <Select
                label="Длительность пробного урока"
                value={f.trialDur}
                onChange={(e) => set("trialDur", e.target.value)}
              >
                {TRIAL_DURATIONS.map((d) => (
                  <option key={d.v} value={d.v}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex justify-end border-t border-zinc-100 pt-4">
          <Button
            size="lg"
            loading={saving}
            disabled={!f.subject_id || !toTiyin(f.p60)}
            onClick={save}
          >
            <Plus size={18} aria-hidden="true" />
            Добавить урок
          </Button>
        </div>
      </Card>
    </div>
  );
}
