"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  Plus,
  Search,
  Wallet,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { BookingStatus, Locale } from "@ustoz/shared";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchCatalog, type CatalogCard } from "@/lib/catalog";
import { localizeList } from "@/lib/content-i18n";
import { formatFullDate, formatTime } from "@/lib/datetime";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Price } from "@/components/ui/price";
import { RatingStars } from "@/components/ui/rating-stars";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { useCabinet } from "@/components/cabinet/cabinet-shell";

type NextBooking = {
  id: string;
  status: BookingStatus;
  start_at: string;
  duration_min: number;
  teacher_subjects: { subjects: { name_uz: string; name_ru: string } | null } | null;
  teacher: {
    slug: string;
    profiles: { full_name: string; avatar_url: string | null } | null;
  } | null;
};

const NEXT_SELECT = `
  id, status, start_at, duration_min,
  teacher_subjects ( subjects ( name_uz, name_ru ) ),
  teacher:teacher_profiles!bookings_teacher_id_fkey (
    slug, profiles!teacher_profiles_user_id_fkey ( full_name, avatar_url ) )
`;

export default function CabinetHomePage() {
  const t = useTranslations("Cabinet.home");
  const tCommon = useTranslations("Cabinet.common");
  const locale = useLocale() as Locale;
  const { userId, profile } = useCabinet();

  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [next, setNext] = useState<NextBooking | null>(null);
  const [hasBookings, setHasBookings] = useState(false);
  const [recommended, setRecommended] = useState<CatalogCard[]>([]);

  const load = useCallback(async () => {
    const supabase = createClient();
    const nowIso = new Date().toISOString();
    try {
      const [nextRes, countRes, cards] = await Promise.all([
        supabase
          .from("bookings")
          .select(NEXT_SELECT)
          .eq("student_id", userId)
          .in("status", ["pending_payment", "paid"])
          .gte("start_at", nowIso)
          .order("start_at", { ascending: true })
          .limit(1),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("student_id", userId),
        fetchCatalog({ perPage: 3, sort: "recommended" }).catch(
          () => [] as CatalogCard[],
        ),
      ]);
      if (nextRes.error || countRes.error) {
        setPhase("error");
        return;
      }
      setNext((nextRes.data?.[0] ?? null) as unknown as NextBooking | null);
      setHasBookings((countRes.count ?? 0) > 0);
      setRecommended(cards);
      setPhase("ready");
    } catch {
      setPhase("error");
    }
  }, [userId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const firstName = profile.full_name.trim().split(/\s+/)[0] ?? "";

  if (phase === "loading") {
    return (
      <div aria-busy="true" className="space-y-5">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
        <SkeletonCard />
      </div>
    );
  }

  if (phase === "error") {
    return <ErrorState description={tCommon("loadError")} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          {firstName ? t("greeting", { name: firstName }) : t("greetingFallback")}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Next lesson / empty states */}
        {!hasBookings ? (
          <EmptyState
            icon={CalendarPlus}
            title={t("noLessonsTitle")}
            description={t("noLessonsBody")}
            action={<ButtonLink href="/catalog">{t("goCatalog")}</ButtonLink>}
            className="md:col-span-2 lg:col-span-1"
          />
        ) : next ? (
          <NextLessonCard booking={next} locale={locale} />
        ) : (
          <Card className="flex flex-col items-start p-5">
            <p className="text-base font-semibold text-zinc-900">
              {t("noUpcomingTitle")}
            </p>
            <ButtonLink
              href="/catalog"
              variant="secondary"
              size="sm"
              className="mt-auto"
            >
              {t("findTeacher")}
            </ButtonLink>
          </Card>
        )}

        {/* Balance */}
        <Card className="flex flex-col p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {t("balance")}
            </p>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Wallet size={18} aria-hidden="true" />
            </span>
          </div>
          <Price tiyin={profile.student_balance} className="mt-1 text-3xl font-bold" />
          <p className="mt-2 mb-4 text-xs leading-relaxed text-zinc-500">
            {t("topupNote")}
          </p>
          <ButtonLink
            href="/cabinet/payments"
            variant="primary"
            size="sm"
            className="mt-auto w-full"
          >
            <Plus size={16} aria-hidden="true" />
            {t("topup")}
          </ButtonLink>
        </Card>
      </div>

      {/* Quick actions */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          {t("quick")}
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/catalog"
            className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm outline-none transition hover:border-brand-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Search size={19} aria-hidden="true" />
            </span>
            <span className="font-semibold text-zinc-900">{t("findTeacher")}</span>
            <ChevronRight size={16} className="ml-auto text-zinc-400" aria-hidden="true" />
          </Link>
          <Link
            href="/cabinet/lessons"
            className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm outline-none transition hover:border-brand-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <CalendarDays size={19} aria-hidden="true" />
            </span>
            <span className="font-semibold text-zinc-900">{t("myLessons")}</span>
            <ChevronRight size={16} className="ml-auto text-zinc-400" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Recommended teachers */}
      {recommended.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            {t("recommended")}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map((card) => (
              <Link
                key={card.user_id}
                href={`/t/${card.slug}`}
                className="flex flex-col gap-2.5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm outline-none transition hover:border-brand-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                <div className="flex items-center gap-3">
                  <Avatar src={card.avatar_url} name={card.full_name} size="md" />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-zinc-900">
                      {card.full_name}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {localizeList(locale, card.subjects_uz, card.subjects_ru).join(
                        " · ",
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <RatingStars
                    value={Number(card.rating_avg)}
                    count={card.rating_count}
                    size={13}
                  />
                  <Price tiyin={card.min_price_60} from className="text-sm" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function NextLessonCard({
  booking,
  locale,
}: {
  booking: NextBooking;
  locale: Locale;
}) {
  const t = useTranslations("Cabinet.home");
  const subjectRow = booking.teacher_subjects?.subjects ?? null;
  const subject = subjectRow
    ? locale === "ru"
      ? subjectRow.name_ru
      : subjectRow.name_uz
    : "";
  const teacherName = booking.teacher?.profiles?.full_name ?? "";
  const start = new Date(booking.start_at);
  const end = new Date(start.getTime() + booking.duration_min * 60_000);

  const [nowTs] = useState(() => Date.now());
  const minutesLeft = Math.max(1, Math.round((start.getTime() - nowTs) / 60_000));
  const countdown =
    minutesLeft < 60
      ? t("startsInM", { minutes: minutesLeft })
      : minutesLeft < 48 * 60
        ? t("startsInH", { hours: Math.round(minutesLeft / 60) })
        : t("startsInD", { days: Math.round(minutesLeft / 1440) });

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          {t("nextLesson")}
        </p>
        <StatusBadge status={booking.status} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Avatar
          src={booking.teacher?.profiles?.avatar_url}
          name={teacherName}
          size="md"
        />
        <div className="min-w-0">
          <p className="truncate font-bold text-zinc-900">{teacherName}</p>
          <p className="truncate text-sm text-zinc-500">{subject}</p>
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold text-zinc-900">
        {formatFullDate(start, locale)} · {formatTime(start, locale)}–
        {formatTime(end, locale)}
      </p>
      <p className="mt-1 text-sm font-medium text-brand-700">{countdown}</p>
      <div className="mt-auto pt-4">
        <ButtonLink href={`/booking/${booking.id}`} size="sm" variant="secondary">
          {t("details")}
        </ButtonLink>
      </div>
    </Card>
  );
}
