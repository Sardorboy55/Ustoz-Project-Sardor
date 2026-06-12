"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, GraduationCap, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { BookingStatus, Locale } from "@ustoz/shared";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { formatDayMonth, formatTime, formatWeekdayShort } from "@/lib/datetime";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Modal } from "@/components/ui/modal";
import { Price } from "@/components/ui/price";
import { SkeletonCard } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { ContactTeacherButton } from "@/components/teacher/contact-button";
import { useCabinet } from "@/components/cabinet/cabinet-shell";

type LessonRow = {
  id: string;
  kind: string;
  status: BookingStatus;
  start_at: string;
  duration_min: number;
  price: number;
  teacher_id: string;
  teacher_subjects: { subjects: { name_uz: string; name_ru: string } | null } | null;
  teacher: {
    slug: string;
    profiles: { full_name: string; avatar_url: string | null } | null;
  } | null;
  review: { stars: number } | null;
};

const SELECT = `
  id, kind, status, start_at, duration_min, price, teacher_id,
  teacher_subjects ( subjects ( name_uz, name_ru ) ),
  teacher:teacher_profiles!bookings_teacher_id_fkey (
    slug, profiles!teacher_profiles_user_id_fkey ( full_name, avatar_url ) ),
  review:reviews ( stars )
`;

const ACTIVE: BookingStatus[] = ["pending_payment", "paid", "in_progress"];
const CANCEL_WINDOW_H = 12;

const endOf = (row: LessonRow) =>
  new Date(row.start_at).getTime() + row.duration_min * 60_000;

export default function LessonsPage() {
  const t = useTranslations("Cabinet.lessons");
  const tCommon = useTranslations("Cabinet.common");
  const locale = useLocale() as Locale;
  const { userId } = useCabinet();

  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [rows, setRows] = useState<LessonRow[]>([]);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [cancelTarget, setCancelTarget] = useState<LessonRow | null>(null);
  const [reviewTarget, setReviewTarget] = useState<LessonRow | null>(null);
  // captured once per mount — splitting upcoming/past doesn't need a live clock
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bookings")
      .select(SELECT)
      .eq("student_id", userId)
      .order("start_at", { ascending: false });
    if (error) {
      setPhase("error");
      return;
    }
    setRows((data ?? []) as unknown as LessonRow[]);
    setPhase("ready");
  }, [userId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const upcoming = rows
    .filter((r) => ACTIVE.includes(r.status) && endOf(r) > now)
    .sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at));
  const past = rows.filter((r) => !(ACTIVE.includes(r.status) && endOf(r) > now));
  const visible = tab === "upcoming" ? upcoming : past;

  const patchRow = (id: string, patch: Partial<LessonRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
        {t("title")}
      </h1>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label={t("title")}
        className="mt-4 flex gap-6 border-b border-zinc-200"
      >
        {(["upcoming", "past"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "-mb-px border-b-2 px-1 pb-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-600",
              tab === key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800",
            )}
          >
            {t(key)}
            {phase === "ready" && (
              <span className="ml-1.5 text-xs text-zinc-400">
                {key === "upcoming" ? upcoming.length : past.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {phase === "loading" &&
          Array.from({ length: 3 }, (_, i) => <SkeletonCard key={i} />)}

        {phase === "error" && (
          <ErrorState
            description={tCommon("loadError")}
            onRetry={() => void load()}
          />
        )}

        {phase === "ready" && visible.length === 0 && (
          <EmptyState
            icon={tab === "upcoming" ? CalendarPlus : GraduationCap}
            title={tab === "upcoming" ? t("emptyUpcomingTitle") : t("emptyPastTitle")}
            description={
              tab === "upcoming" ? t("emptyUpcomingBody") : t("emptyPastBody")
            }
            action={
              tab === "upcoming" ? (
                <ButtonLink href="/catalog">{t("goCatalog")}</ButtonLink>
              ) : undefined
            }
          />
        )}

        {phase === "ready" &&
          visible.map((row) => (
            <LessonCard
              key={row.id}
              row={row}
              locale={locale}
              upcoming={tab === "upcoming"}
              onCancel={() => setCancelTarget(row)}
              onReview={() => setReviewTarget(row)}
            />
          ))}
      </div>

      <CancelModal
        row={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onCancelled={(id) => patchRow(id, { status: "cancelled_by_student" })}
      />
      <ReviewModal
        row={reviewTarget}
        studentId={userId}
        onClose={() => setReviewTarget(null)}
        onReviewed={(id, stars) => patchRow(id, { review: { stars } })}
      />
    </div>
  );
}

function LessonCard({
  row,
  locale,
  upcoming,
  onCancel,
  onReview,
}: {
  row: LessonRow;
  locale: Locale;
  upcoming: boolean;
  onCancel: () => void;
  onReview: () => void;
}) {
  const t = useTranslations("Cabinet.lessons");
  const tUi = useTranslations("Ui");
  const subjectRow = row.teacher_subjects?.subjects ?? null;
  const subject = subjectRow
    ? locale === "ru"
      ? subjectRow.name_ru
      : subjectRow.name_uz
    : "";
  const teacherName = row.teacher?.profiles?.full_name ?? "";
  const start = new Date(row.start_at);
  const end = new Date(start.getTime() + row.duration_min * 60_000);
  const cancellable =
    upcoming && (row.status === "pending_payment" || row.status === "paid");
  const reviewable = row.status === "completed" && !row.review;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        {/* Date block */}
        <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-brand-50 px-2 py-2 text-brand-800">
          <span className="text-[11px] font-semibold uppercase">
            {formatWeekdayShort(start, locale)}
          </span>
          <span className="text-sm font-bold leading-tight">
            {formatDayMonth(start, locale)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-zinc-900">{subject}</span>
            <StatusBadge status={row.status} />
          </div>
          <p className="mt-0.5 text-sm text-zinc-600">
            {formatTime(start, locale)}–{formatTime(end, locale)} ·{" "}
            {row.duration_min} {locale === "ru" ? "мин" : "daq"}
          </p>
          <Link
            href={`/t/${row.teacher?.slug ?? ""}`}
            className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-zinc-700 hover:text-brand-700"
          >
            <Avatar
              src={row.teacher?.profiles?.avatar_url}
              name={teacherName}
              size="sm"
            />
            <span className="truncate">{teacherName}</span>
          </Link>
        </div>

        <div className="flex flex-col items-end gap-1">
          {row.price === 0 ? (
            <span className="text-sm font-semibold text-brand-700">
              {tUi("freeTrial")}
            </span>
          ) : (
            <Price tiyin={row.price} />
          )}
          {row.review && (
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
              <Star
                size={13}
                className="text-accent-500"
                fill="currentColor"
                strokeWidth={0}
                aria-hidden="true"
              />
              {row.review.stars}.0 · {t("reviewed")}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
        <ButtonLink href={`/booking/${row.id}`} variant="ghost" size="sm">
          {t("details")}
        </ButtonLink>
        {upcoming && row.teacher?.slug && (
          <ContactTeacherButton
            teacherId={row.teacher_id}
            teacherSlug={row.teacher.slug}
            variant="ghost"
            size="sm"
          >
            {t("write")}
          </ContactTeacherButton>
        )}
        {cancellable && (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50 active:bg-red-100"
            onClick={onCancel}
          >
            {t("cancel")}
          </Button>
        )}
        {reviewable && (
          <Button variant="secondary" size="sm" onClick={onReview}>
            <Star size={15} aria-hidden="true" />
            {t("leaveReview")}
          </Button>
        )}
      </div>
    </Card>
  );
}

/** Cancellation modal — reuses the policy texts of /booking/[id]. */
function CancelModal({
  row,
  onClose,
  onCancelled,
}: {
  row: LessonRow | null;
  onClose: () => void;
  onCancelled: (id: string) => void;
}) {
  const tB = useTranslations("Booking.page");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [nowTs] = useState(() => Date.now());

  // reset per-target state by keying on the row id
  const [lastId, setLastId] = useState<string | null>(null);
  if (row && row.id !== lastId) {
    setLastId(row.id);
    setReason("");
    setFailed(false);
  }

  if (!row) return <Modal open={false} onClose={onClose}>{null}</Modal>;

  const hoursLeft = (new Date(row.start_at).getTime() - nowTs) / 3_600_000;
  const note =
    row.status === "pending_payment"
      ? tB("cancelPendingNote")
      : row.price === 0
        ? tB("cancelTrialNote")
        : hoursLeft >= CANCEL_WINDOW_H
          ? tB("cancelRefund100")
          : tB("cancelRefund0");

  const doCancel = async () => {
    setBusy(true);
    setFailed(false);
    const supabase = createClient();
    const { error } = await supabase.functions.invoke("booking-cancel", {
      body: {
        bookingId: row.id,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      },
    });
    setBusy(false);
    if (error) {
      setFailed(true);
      return;
    }
    onCancelled(row.id);
    onClose();
  };

  return (
    <Modal open onClose={() => !busy && onClose()} title={tB("cancelTitle")}>
      <p className="text-sm leading-relaxed text-zinc-600">{note}</p>
      <Textarea
        label={tB("cancelReason")}
        rows={3}
        maxLength={500}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        wrapperClassName="mt-4"
      />
      {failed && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {tB("cancelError")}
        </p>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-2.5">
        <Button variant="ghost" disabled={busy} onClick={onClose}>
          {tB("cancelKeep")}
        </Button>
        <Button variant="danger" loading={busy} onClick={doCancel}>
          {tB("cancelConfirm")}
        </Button>
      </div>
    </Modal>
  );
}

const TAG_KEYS = ["tagPunctual", "tagClear", "tagPolite", "tagRecommend"] as const;

/** Review modal: 1–5 stars, quick tags appended to the text, comment. */
function ReviewModal({
  row,
  studentId,
  onClose,
  onReviewed,
}: {
  row: LessonRow | null;
  studentId: string;
  onClose: () => void;
  onReviewed: (id: string, stars: number) => void;
}) {
  const t = useTranslations("Cabinet.lessons");
  const [stars, setStars] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<"reviewDuplicate" | "reviewError" | null>(
    null,
  );

  const [lastId, setLastId] = useState<string | null>(null);
  if (row && row.id !== lastId) {
    setLastId(row.id);
    setStars(0);
    setBody("");
    setErrorKey(null);
  }

  if (!row) return <Modal open={false} onClose={onClose}>{null}</Modal>;

  const toggleTag = (label: string) => {
    setBody((prev) => {
      if (prev.includes(label)) {
        return prev
          .replace(`${label}. `, "")
          .replace(`${label}.`, "")
          .replace(label, "")
          .trimStart();
      }
      const base = prev.trim();
      return base ? `${base.replace(/\.?$/, ".")} ${label}.` : `${label}.`;
    });
  };

  const submit = async () => {
    if (stars < 1) return;
    setBusy(true);
    setErrorKey(null);
    const supabase = createClient();
    const { error } = await supabase.from("reviews").insert({
      booking_id: row.id,
      student_id: studentId,
      teacher_id: row.teacher_id,
      stars,
      body: body.trim() || null,
    });
    setBusy(false);
    if (error) {
      if (error.code === "23505") {
        // already reviewed (e.g. from mobile) — reflect it and close
        setErrorKey("reviewDuplicate");
        onReviewed(row.id, stars);
        return;
      }
      setErrorKey("reviewError");
      return;
    }
    onReviewed(row.id, stars);
    onClose();
  };

  return (
    <Modal open onClose={() => !busy && onClose()} title={t("reviewTitle")}>
      <p className="text-sm font-medium text-zinc-700">{t("reviewStars")}</p>
      <div className="mt-2 flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} / 5`}
            aria-pressed={stars >= n}
            onClick={() => setStars(n)}
            className="rounded-lg p-0.5 outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            <Star
              size={30}
              aria-hidden="true"
              className={stars >= n ? "text-accent-500" : "text-zinc-200"}
              fill="currentColor"
              strokeWidth={0}
            />
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm font-medium text-zinc-700">{t("reviewTags")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {TAG_KEYS.map((key) => {
          const label = t(key);
          const active = body.includes(label);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => toggleTag(label)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-600",
                active
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-brand-300",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <Textarea
        label={t("reviewComment")}
        rows={3}
        maxLength={1000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        wrapperClassName="mt-4"
      />

      {errorKey && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {t(errorKey)}
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <Button loading={busy} disabled={stars < 1} onClick={submit}>
          {t("reviewSubmit")}
        </Button>
      </div>
    </Modal>
  );
}
