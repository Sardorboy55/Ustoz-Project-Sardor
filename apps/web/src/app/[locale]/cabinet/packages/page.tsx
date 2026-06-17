"use client";

import { useCallback, useEffect, useState } from "react";
import { Package } from "lucide-react";
import { useLocale } from "next-intl";
import type { Locale } from "@ustoz/shared";
import { createClient } from "@/lib/supabase/client";
import { localizeContent } from "@/lib/content-i18n";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useCabinet } from "@/components/cabinet/cabinet-shell";

type PkgRow = {
  id: string;
  lessons_total: number;
  lessons_left: number;
  duration_min: number;
  price_paid: number;
  expires_at: string;
  teacher_subjects: {
    subjects: { name_uz: string; name_ru: string } | null;
  } | null;
};

const SELECT = `
  id, lessons_total, lessons_left, duration_min, price_paid, expires_at, created_at,
  teacher_subjects ( subjects ( name_uz, name_ru ) )
`;

export default function PackagesPage() {
  const locale = useLocale() as Locale;
  const { userId } = useCabinet();
  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [rows, setRows] = useState<PkgRow[]>([]);
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("student_packages")
      .select(SELECT)
      .eq("student_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      setPhase("error");
      return;
    }
    setRows((data ?? []) as unknown as PkgRow[]);
    setPhase("ready");
  }, [userId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  if (phase === "loading") {
    return (
      <div className="max-w-3xl space-y-3" aria-busy="true">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }
  if (phase === "error") {
    return (
      <ErrorState
        description="Не удалось загрузить пакеты"
        onRetry={() => void load()}
      />
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
        Мои пакеты
      </h1>
      <p className="mt-0.5 text-sm text-zinc-500">
        Купленные наборы уроков. При брони списывается 1 урок из пакета.
      </p>

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Пакетов пока нет"
            description="Купите пакет на странице преподавателя — это выгоднее, чем оплачивать каждый урок отдельно."
          />
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {rows.map((p) => {
            const name = p.teacher_subjects?.subjects
              ? localizeContent(
                  locale,
                  p.teacher_subjects.subjects.name_uz,
                  p.teacher_subjects.subjects.name_ru,
                )
              : "Урок";
            const expired = new Date(p.expires_at).getTime() < now;
            const pct = Math.round((p.lessons_left / p.lessons_total) * 100);
            return (
              <Card key={p.id} className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <Package size={20} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-zinc-900">
                        {name} · {p.duration_min} мин
                      </p>
                      <p className="text-xs text-zinc-500">
                        Действует до{" "}
                        {new Date(p.expires_at).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-2xl font-extrabold leading-none text-zinc-900">
                      {p.lessons_left}
                      <span className="text-sm font-medium text-zinc-400">
                        /{p.lessons_total}
                      </span>
                    </p>
                    <p className="text-xs text-zinc-500">осталось</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-brand-600"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {expired && (
                  <p className="mt-2 text-xs font-medium text-amber-600">
                    Срок действия истёк
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
