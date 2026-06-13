"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { CatalogCard } from "@/lib/catalog";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { FavoritesProvider } from "@/components/favorites";
import { TeacherCard } from "@/components/teacher-card";
import { useCabinet } from "@/components/cabinet/cabinet-shell";

type FavoriteRow = {
  teacher_id: string;
  teacher: {
    user_id: string;
    slug: string;
    headline_uz: string;
    headline_ru: string;
    rating_avg: number;
    rating_count: number;
    lessons_done: number;
    tier: "free" | "pro";
    is_verified: boolean;
    teaching_langs: string[];
    profiles: { full_name: string; avatar_url: string | null } | null;
    teacher_subjects: Array<{
      price_60: number;
      trial_free_enabled: boolean;
      is_active: boolean;
      subjects: { name_uz: string; name_ru: string } | null;
    }>;
  } | null;
};

const SELECT = `
  teacher_id,
  teacher:teacher_profiles!student_favorites_teacher_id_fkey (
    user_id, slug, headline_uz, headline_ru, rating_avg, rating_count,
    lessons_done, tier, is_verified, teaching_langs,
    profiles!teacher_profiles_user_id_fkey ( full_name, avatar_url ),
    teacher_subjects ( price_60, trial_free_enabled, is_active,
      subjects ( name_uz, name_ru ) )
  )
`;

function toCard(row: FavoriteRow): CatalogCard | null {
  const tp = row.teacher;
  if (!tp) return null;
  const active = tp.teacher_subjects.filter((s) => s.is_active);
  return {
    user_id: tp.user_id,
    slug: tp.slug,
    full_name: tp.profiles?.full_name ?? "",
    avatar_url: tp.profiles?.avatar_url ?? null,
    headline_uz: tp.headline_uz,
    headline_ru: tp.headline_ru,
    rating_avg: Number(tp.rating_avg),
    rating_count: tp.rating_count,
    lessons_done: tp.lessons_done,
    tier: tp.tier,
    is_verified: tp.is_verified,
    teaching_langs: tp.teaching_langs,
    min_price_60: active.length
      ? Math.min(...active.map((s) => s.price_60))
      : 0,
    has_free_trial: active.some((s) => s.trial_free_enabled),
    subjects_uz: active.map((s) => s.subjects?.name_uz ?? "").filter(Boolean),
    subjects_ru: active.map((s) => s.subjects?.name_ru ?? "").filter(Boolean),
    total_count: 0,
  };
}

export default function FavoritesPage() {
  const t = useTranslations("Cabinet.favorites");
  const tCommon = useTranslations("Cabinet.common");
  const { userId } = useCabinet();

  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [cards, setCards] = useState<CatalogCard[]>([]);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("student_favorites")
      .select(SELECT)
      .eq("student_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      setPhase("error");
      return;
    }
    setCards(
      ((data ?? []) as unknown as FavoriteRow[])
        .map(toCard)
        .filter((c): c is CatalogCard => c !== null),
    );
    setPhase("ready");
  }, [userId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
        {t("title")}
      </h1>

      <div className="mt-4">
        {phase === "loading" && (
          <div aria-busy="true" className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {phase === "error" && (
          <ErrorState description={tCommon("loadError")} onRetry={() => void load()} />
        )}

        {phase === "ready" && cards.length === 0 && (
          <EmptyState
            icon={Heart}
            title={t("emptyTitle")}
            description={t("emptyBody")}
            action={<ButtonLink href="/catalog">{t("goCatalog")}</ButtonLink>}
          />
        )}

        {phase === "ready" && cards.length > 0 && (
          <FavoritesProvider>
            <div className="space-y-3">
              {cards.map((card) => (
                <TeacherCard key={card.user_id} card={card} />
              ))}
            </div>
          </FavoritesProvider>
        )}
      </div>
    </div>
  );
}
