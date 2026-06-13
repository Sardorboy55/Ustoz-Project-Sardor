"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@ustoz/shared";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCabinet } from "@/components/cabinet/cabinet-shell";

type SubjectOption = { id: string; name_uz: string; name_ru: string };

type MyRow = {
  id: string;
  subject_id: string;
  price_30: number | null;
  price_60: number;
  price_90: number | null;
  trial_free_enabled: boolean;
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
  const [allSubjects, setAllSubjects] = useState<SubjectOption[]>([]);
  const [mine, setMine] = useState<MyRow[]>([]);

  // add-form state
  const [newSubjectId, setNewSubjectId] = useState("");
  const [newPrice60, setNewPrice60] = useState("");
  const [newTrial, setNewTrial] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const name = (s: { name_uz: string; name_ru: string } | null) =>
    s ? (locale === "ru" ? s.name_ru : s.name_uz) : "";

  const load = useCallback(async () => {
    const supabase = createClient();
    const [subjRes, mineRes] = await Promise.all([
      supabase
        .from("subjects")
        .select("id, name_uz, name_ru")
        .eq("is_active", true)
        .order(locale === "ru" ? "name_ru" : "name_uz", { ascending: true }),
      supabase
        .from("teacher_subjects")
        .select(
          "id, subject_id, price_30, price_60, price_90, trial_free_enabled, subjects(name_uz, name_ru)",
        )
        .eq("teacher_id", userId),
    ]);
    if (subjRes.error || mineRes.error) {
      setPhase("error");
      return;
    }
    setAllSubjects((subjRes.data ?? []) as SubjectOption[]);
    setMine((mineRes.data ?? []) as unknown as MyRow[]);
    setPhase("ready");
  }, [userId, locale]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const available = allSubjects.filter(
    (s) => !mine.some((m) => m.subject_id === s.id),
  );

  const add = async () => {
    const price60 = toTiyin(newPrice60);
    if (!newSubjectId || !price60) return;
    setAdding(true);
    setAddError(null);
    const supabase = createClient();
    const { error } = await supabase.from("teacher_subjects").insert({
      teacher_id: userId,
      subject_id: newSubjectId,
      price_60: price60,
      trial_free_enabled: newTrial,
    });
    setAdding(false);
    if (error) {
      setAddError(
        error.message.includes("SUBJECT_LIMIT") ? t("subjectLimit") : t("subjectError"),
      );
      return;
    }
    setNewSubjectId("");
    setNewPrice60("");
    setNewTrial(false);
    await load();
  };

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

      {/* Add form */}
      <Card className="p-5">
        <p className="text-sm font-semibold text-zinc-800">{t("addSubject")}</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Select
            label={t("pickSubject")}
            value={newSubjectId}
            onChange={(e) => setNewSubjectId(e.target.value)}
            wrapperClassName="min-w-44 flex-1"
          >
            <option value="">—</option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>
                {name(s)}
              </option>
            ))}
          </Select>
          <Input
            label={t("price60")}
            inputMode="numeric"
            value={newPrice60}
            onChange={(e) => setNewPrice60(e.target.value.replace(/\D/g, ""))}
            wrapperClassName="w-44"
          />
          <Button
            onClick={add}
            loading={adding}
            disabled={!newSubjectId || !toTiyin(newPrice60)}
          >
            <Plus size={16} aria-hidden="true" />
            {t("subjectAdd")}
          </Button>
        </div>
        <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={newTrial}
            onChange={(e) => setNewTrial(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 accent-brand-600"
          />
          {t("trialToggle")}
        </label>
        {addError && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {addError}
          </p>
        )}
      </Card>

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
  onChanged,
}: {
  row: MyRow;
  title: string;
  onChanged: () => Promise<void>;
}) {
  const t = useTranslations("Cabinet.teacher");
  const [p30, setP30] = useState(toUzsStr(row.price_30));
  const [p60, setP60] = useState(toUzsStr(row.price_60));
  const [p90, setP90] = useState(toUzsStr(row.price_90));
  const [trial, setTrial] = useState(row.trial_free_enabled);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");

  const dirty =
    p30 !== toUzsStr(row.price_30) ||
    p60 !== toUzsStr(row.price_60) ||
    p90 !== toUzsStr(row.price_90) ||
    trial !== row.trial_free_enabled;

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

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold text-zinc-900">{title}</p>
        <Button
          variant="ghost"
          size="sm"
          loading={deleting}
          onClick={remove}
          className="text-red-600 hover:bg-red-50 active:bg-red-100"
        >
          {!deleting && <Trash2 size={15} aria-hidden="true" />}
          {t("subjectDelete")}
        </Button>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input
          label={t("price30")}
          helper={t("optional")}
          inputMode="numeric"
          value={p30}
          onChange={(e) => {
            setP30(e.target.value.replace(/\D/g, ""));
            setState("idle");
          }}
        />
        <Input
          label={t("price60")}
          inputMode="numeric"
          value={p60}
          onChange={(e) => {
            setP60(e.target.value.replace(/\D/g, ""));
            setState("idle");
          }}
        />
        <Input
          label={t("price90")}
          helper={t("optional")}
          inputMode="numeric"
          value={p90}
          onChange={(e) => {
            setP90(e.target.value.replace(/\D/g, ""));
            setState("idle");
          }}
        />
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
          {state === "saved" && (
            <span className="text-sm font-medium text-brand-700">
              {t("subjectSaved")}
            </span>
          )}
          {state === "error" && (
            <span role="alert" className="text-sm text-red-600">
              {t("subjectError")}
            </span>
          )}
          <Button
            size="sm"
            loading={saving}
            disabled={!dirty || !toTiyin(p60)}
            onClick={save}
          >
            {t("save")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
