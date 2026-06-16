"use client";

import { useCallback, useEffect, useState } from "react";
import { HelpCircle, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCabinet } from "@/components/cabinet/cabinet-shell";

type FaqItem = { q: string; a: string };

/**
 * Teacher FAQ editor (cabinet). The teacher adds question/answer pairs that show
 * on their public profile. Stored as teacher_profiles.faq (jsonb array). Load
 * and save tolerate the column being absent (before the migration is applied).
 */
export function TeacherFaqEditor() {
  const t = useTranslations("Cabinet.teacher");
  const { userId } = useCabinet();

  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("teacher_profiles")
      .select("faq")
      .eq("user_id", userId)
      .maybeSingle();
    const faq = (data?.faq as FaqItem[] | null) ?? [];
    setItems(Array.isArray(faq) ? faq : []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const update = (i: number, patch: Partial<FaqItem>) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
    setSaveState("idle");
  };
  const add = () => {
    setItems((prev) => [...prev, { q: "", a: "" }]);
    setSaveState("idle");
  };
  const remove = (i: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
    setSaveState("idle");
  };

  const save = async () => {
    setSaving(true);
    setSaveState("idle");
    // drop empty rows; trim
    const clean = items
      .map((it) => ({ q: it.q.trim(), a: it.a.trim() }))
      .filter((it) => it.q && it.a);
    const supabase = createClient();
    const { error } = await supabase
      .from("teacher_profiles")
      .update({ faq: clean })
      .eq("user_id", userId);
    setSaving(false);
    if (error) {
      setSaveState("error");
      return;
    }
    setItems(clean);
    setSaveState("saved");
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <HelpCircle size={18} className="text-brand-600" aria-hidden="true" />
        <h2 className="text-lg font-bold text-zinc-900">{t("faqTitle")}</h2>
      </div>
      <p className="mt-0.5 text-sm text-zinc-500">{t("faqSubtitle")}</p>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-400">…</p>
      ) : (
        <>
          {items.length === 0 && (
            <p className="mt-4 text-sm text-zinc-400">{t("faqEmpty")}</p>
          )}

          <div className="mt-4 space-y-4">
            {items.map((it, i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4"
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Input
                      label={t("faqQuestion")}
                      value={it.q}
                      maxLength={200}
                      onChange={(e) => update(i, { q: e.target.value })}
                    />
                    <Textarea
                      label={t("faqAnswer")}
                      rows={3}
                      maxLength={1000}
                      value={it.a}
                      onChange={(e) => update(i, { a: e.target.value })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    aria-label={t("faqRemove")}
                    className="mt-7 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" onClick={add}>
              <Plus size={15} aria-hidden="true" />
              {t("faqAdd")}
            </Button>
            <Button size="sm" loading={saving} onClick={save}>
              {t("faqSave")}
            </Button>
            {saveState === "saved" && (
              <span className="text-sm font-medium text-emerald-600">
                {t("faqSaved")}
              </span>
            )}
            {saveState === "error" && (
              <span className="text-sm font-medium text-red-600">
                {t("faqError")}
              </span>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
