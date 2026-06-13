"use client";

import { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@ustoz/shared";
import { createClient } from "@/lib/supabase/client";
import { formatDateWithYear } from "@/lib/datetime";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { RatingStars } from "@/components/ui/rating-stars";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useCabinet } from "@/components/cabinet/cabinet-shell";

type ReviewRow = {
  booking_id: string;
  stars: number;
  body: string | null;
  created_at: string;
};

export function TeacherReviews() {
  const t = useTranslations("Cabinet.teacher");
  const tCommon = useTranslations("Cabinet.common");
  const locale = useLocale() as Locale;
  const { userId } = useCabinet();

  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [rating, setRating] = useState<{ avg: number; count: number }>({
    avg: 0,
    count: 0,
  });

  const load = useCallback(async () => {
    const supabase = createClient();
    const [reviewsRes, tpRes] = await Promise.all([
      supabase
        .from("reviews")
        .select("booking_id, stars, body, created_at")
        .eq("teacher_id", userId)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("teacher_profiles")
        .select("rating_avg, rating_count")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    if (reviewsRes.error || tpRes.error) {
      setPhase("error");
      return;
    }
    setRows((reviewsRes.data ?? []) as ReviewRow[]);
    setRating({
      avg: Number(tpRes.data?.rating_avg ?? 0),
      count: tpRes.data?.rating_count ?? 0,
    });
    setPhase("ready");
  }, [userId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  if (phase === "loading") {
    return (
      <div aria-busy="true" className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (phase === "error") {
    return <ErrorState description={tCommon("loadError")} onRetry={() => void load()} />;
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-zinc-900">{t("reviewsTitle")}</h2>
        {rating.count > 0 && (
          <RatingStars value={rating.avg} count={rating.count} size={16} />
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Star}
          title={t("noReviews")}
          description={t("noReviewsBody")}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.booking_id}>
              <Card className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <Avatar name={t("anonymous")} size="sm" />
                  <div className="min-w-0 flex-1">
                    {/* RLS hides review authors — rendered anonymously by design */}
                    <p className="text-sm font-semibold text-zinc-900">
                      {t("anonymous")}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {formatDateWithYear(new Date(r.created_at), locale)}
                    </p>
                  </div>
                  <RatingStars value={r.stars} size={14} showValue={false} />
                </div>
                {r.body && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                    {r.body}
                  </p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
