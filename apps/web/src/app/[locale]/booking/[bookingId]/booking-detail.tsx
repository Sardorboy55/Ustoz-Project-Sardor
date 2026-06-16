"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarPlus,
  CalendarX2,
  Check,
  ChevronLeft,
  Clock,
  CreditCard,
  GraduationCap,
  ShieldCheck,
  Star,
  Wallet,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatUzs, type BookingStatus, type Locale } from "@ustoz/shared";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { buildIcs, downloadIcs } from "@/lib/ics";
import { formatFullDate, formatTime } from "@/lib/datetime";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Modal } from "@/components/ui/modal";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { ContactTeacherButton } from "@/components/teacher/contact-button";
import { LessonPanel } from "@/components/booking/lesson-panel";
import { ReviewForm } from "@/components/lessons/review-form";

type BookingRow = {
  id: string;
  kind: string;
  status: BookingStatus;
  start_at: string;
  duration_min: number;
  price: number;
  created_at: string;
  cancel_reason: string | null;
  teacher_id: string;
  student_id: string;
  teacher_subjects: {
    subjects: { name_uz: string; name_ru: string } | null;
  } | null;
  teacher: {
    slug: string;
    profiles: { full_name: string; avatar_url: string | null } | null;
  } | null;
  review: { stars: number } | null;
  lesson: { meeting_url: string | null } | null;
};

const SELECT = `
  id, kind, status, start_at, duration_min, price, created_at, cancel_reason,
  teacher_id, student_id,
  teacher_subjects ( subjects ( name_uz, name_ru ) ),
  teacher:teacher_profiles!bookings_teacher_id_fkey (
    slug, profiles!teacher_profiles_user_id_fkey ( full_name, avatar_url ) ),
  review:reviews ( stars ),
  lesson:lessons ( meeting_url )
`;

const PENDING_TTL_MS = 15 * 60_000;
const CANCEL_WINDOW_H = 12;

export function BookingDetail({ bookingId }: { bookingId: string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("Booking.page");
  const tW = useTranslations("Booking.widget");
  const tUi = useTranslations("Ui");
  const router = useRouter();

  const [phase, setPhase] = useState<"loading" | "error" | "notfound" | "ready">(
    "loading",
  );
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(false);
  const [refundPct, setRefundPct] = useState<number | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace(`/auth?next=${encodeURIComponent(`/booking/${bookingId}`)}`);
      return;
    }
    setUid(user.id);
    const { data, error } = await supabase
      .from("bookings")
      .select(SELECT)
      .eq("id", bookingId)
      .maybeSingle();
    if (error) {
      // invalid uuid in the URL reads as "no such booking"
      setPhase(error.code === "22P02" ? "notfound" : "error");
      return;
    }
    if (!data) {
      setPhase("notfound");
      return;
    }
    setBooking(data as unknown as BookingRow);
    setPhase("ready");
  }, [bookingId, router]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  // countdown tick while the booking is awaiting payment
  useEffect(() => {
    if (booking?.status !== "pending_payment") return;
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [booking?.status]);

  if (phase === "loading") {
    return (
      <main aria-busy="true" className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="mt-4 h-7 w-56" />
        </div>
        <Skeleton className="mt-8 h-48 w-full rounded-2xl" />
        <SkeletonText lines={2} className="mt-6" />
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <ErrorState description={t("loadError")} onRetry={() => void load()} />
      </main>
    );
  }

  if (phase === "notfound" || !booking) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <EmptyState
          icon={CalendarX2}
          title={t("notFoundTitle")}
          description={t("notFoundBody")}
          action={
            <ButtonLink href="/catalog" variant="secondary">
              {t("goCatalog")}
            </ButtonLink>
          }
        />
      </main>
    );
  }

  const teacherName = booking.teacher?.profiles?.full_name ?? "";
  const subjectRow = booking.teacher_subjects?.subjects ?? null;
  const subjectName = subjectRow
    ? locale === "ru"
      ? subjectRow.name_ru
      : subjectRow.name_uz
    : "";
  const start = new Date(booking.start_at);
  const end = new Date(start.getTime() + booking.duration_min * 60_000);
  const isUpcoming = start.getTime() > nowTs;
  const isTeacherViewer = uid === booking.teacher_id;
  const cancellable =
    (booking.status === "pending_payment" || booking.status === "paid") &&
    isUpcoming;
  const showSuccess =
    booking.status === "pending_payment" || booking.status === "paid";
  // A free booking (trial or package, price 0) has nothing to pay — treat it as
  // confirmed instead of showing the "awaiting payment" countdown.
  const needsPayment =
    booking.status === "pending_payment" && booking.price > 0;
  const displayStatus: BookingStatus =
    booking.status === "pending_payment" && booking.price === 0
      ? "paid"
      : booking.status;

  const payLeftMs =
    new Date(booking.created_at).getTime() + PENDING_TTL_MS - nowTs;
  const mm = Math.max(0, Math.floor(payLeftMs / 60_000));
  const ss = Math.max(0, Math.floor((payLeftMs % 60_000) / 1000));
  const countdown = `${mm}:${String(ss).padStart(2, "0")}`;

  const hoursLeft = (start.getTime() - nowTs) / 3_600_000;
  const cancelNote =
    booking.price === 0
      ? t("cancelTrialNote")
      : booking.status === "pending_payment"
        ? t("cancelPendingNote")
        : isTeacherViewer
          ? t("cancelTeacherNote")
          : hoursLeft >= CANCEL_WINDOW_H
            ? t("cancelRefund100")
            : t("cancelRefund0");

  const doCancel = async () => {
    setCancelling(true);
    setCancelError(false);
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke("booking-cancel", {
      body: {
        bookingId: booking.id,
        ...(cancelReason.trim() ? { reason: cancelReason.trim() } : {}),
      },
    });
    setCancelling(false);
    if (error) {
      setCancelError(true);
      return;
    }
    const res = data as { status?: BookingStatus; refundPct?: number } | null;
    setRefundPct(res?.refundPct ?? 0);
    setBooking({
      ...booking,
      status:
        res?.status ??
        (isTeacherViewer ? "cancelled_by_teacher" : "cancelled_by_student"),
      cancel_reason: cancelReason.trim() || booking.cancel_reason,
    });
    setCancelOpen(false);
  };

  const addToCalendar = () => {
    const ics = buildIcs({
      id: booking.id,
      title: t("calendarTitle", { subject: subjectName }),
      description: t("calendarDescription", { teacher: teacherName }),
      start,
      durationMin: booking.duration_min,
      url:
        typeof window !== "undefined"
          ? `${window.location.origin}/booking/${booking.id}`
          : undefined,
    });
    downloadIcs(`ustoz-${booking.id.slice(0, 8)}.ics`, ics);
  };

  const cancelled =
    booking.status === "cancelled_by_student" ||
    booking.status === "cancelled_by_teacher" ||
    booking.status === "expired" ||
    booking.status === "no_show_student" ||
    booking.status === "no_show_teacher";

  // ===================== Checkout (awaiting payment) =====================
  // Two-column layout: payment options on the left, a sticky order summary on
  // the right. Online providers are not wired yet (Phase 7), so methods and the
  // pay button stay disabled with a "soon" note — the layout is payment-ready.
  if (needsPayment) {
    const priceLabel = tUi("price", { price: formatUzs(booking.price, locale) });
    const methods: Array<{ key: string; icon: typeof Wallet; label: string }> = [
      { key: "balance", icon: Wallet, label: t("balance") },
      { key: "payme", icon: CreditCard, label: "Payme" },
      { key: "click", icon: CreditCard, label: "Click" },
      { key: "uzum", icon: CreditCard, label: "Uzum" },
    ];
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/cabinet/lessons"
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          {t("myLessons")}
        </Link>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left: countdown + payment methods */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
              <p className="font-bold text-amber-800">{t("pendingTitle")}</p>
              <p className="mt-1 text-sm text-amber-700">{t("pendingBody")}</p>
              <p className="mt-2 text-sm font-semibold text-amber-800">
                {payLeftMs > 0 ? (
                  t("expiresIn", { time: countdown })
                ) : (
                  <span className="inline-flex flex-wrap items-center gap-3">
                    {t("expiredMaybe")}
                    <Button size="sm" variant="secondary" onClick={() => void load()}>
                      {t("refresh")}
                    </Button>
                  </span>
                )}
              </p>
            </div>

            <Card className="p-5 sm:p-6">
              <h2 className="text-base font-bold text-zinc-900">
                {t("paymentTitle")}
              </h2>
              <ul className="mt-3 divide-y divide-zinc-100">
                {methods.map(({ key, icon: Icon, label }) => (
                  <li key={key} className="flex items-center gap-3 py-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span className="flex-1 font-semibold text-zinc-700">
                      {label}
                    </span>
                    <Badge variant="neutral">{t("soon")}</Badge>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                {t("paymentNote")}
              </p>
            </Card>
          </div>

          {/* Right: sticky order summary */}
          <aside className="h-fit lg:sticky lg:top-24">
            <Card className="p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                {t("checkoutSummary")}
              </p>
              <Link
                href={`/t/${booking.teacher?.slug ?? ""}`}
                className="group mt-3 flex items-center gap-3"
              >
                <Avatar
                  src={booking.teacher?.profiles?.avatar_url}
                  name={teacherName}
                  size="md"
                />
                <span className="min-w-0">
                  <span className="block truncate font-bold text-zinc-900 group-hover:text-brand-700">
                    {teacherName}
                  </span>
                  <span className="block truncate text-sm text-zinc-500">
                    {subjectName}
                  </span>
                </span>
              </Link>

              <dl className="mt-5 space-y-2.5 border-t border-zinc-100 pt-5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">{tW("date")}</dt>
                  <dd className="text-right font-semibold text-zinc-900">
                    {formatFullDate(start, locale)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">{tW("time")}</dt>
                  <dd className="text-right font-semibold text-zinc-900">
                    {formatTime(start, locale)}–{formatTime(end, locale)} ·{" "}
                    {tW("durationValue", { min: booking.duration_min })}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">{tW("subject")}</dt>
                  <dd className="text-right font-semibold text-zinc-900">
                    {subjectName}
                  </dd>
                </div>
              </dl>

              <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-5">
                <span className="font-bold text-zinc-900">{t("total")}</span>
                <span className="text-lg font-extrabold text-zinc-900">
                  {priceLabel}
                </span>
              </div>

              <Button size="lg" className="mt-5 w-full" disabled>
                {t("payCta", { amount: priceLabel })}
              </Button>
              <p className="mt-2 text-center text-xs text-zinc-400">{t("soon")}</p>

              <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-emerald-50 p-3.5">
                <ShieldCheck
                  size={18}
                  className="mt-0.5 shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-bold text-emerald-800">
                    {t("guaranteeTitle")}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-emerald-700">
                    {t("guaranteeBody")}
                  </p>
                </div>
              </div>
            </Card>
          </aside>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      {/* Header */}
      {showSuccess ? (
        <div className="flex flex-col items-center text-center">
          <span className="animate-pop-in flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check size={32} strokeWidth={3} aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            {t("createdTitle")}
          </h1>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <StatusBadge status={displayStatus} />
        </div>
      )}

      {/* Post-cancel banner */}
      {refundPct !== null && (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
          <p className="font-semibold">{t("cancelledBanner")}</p>
          {refundPct > 0 && (
            <p className="mt-1">{t("refundedPct", { pct: refundPct })}</p>
          )}
        </div>
      )}

      {/* Details */}
      <Card className="mt-8 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href={`/t/${booking.teacher?.slug ?? ""}`}
            className="group flex min-w-0 items-center gap-3"
          >
            <Avatar
              src={booking.teacher?.profiles?.avatar_url}
              name={teacherName}
              size="md"
            />
            <span className="min-w-0">
              <span className="block truncate font-bold text-zinc-900 group-hover:text-brand-700">
                {teacherName}
              </span>
              <span className="block truncate text-sm text-zinc-500">
                {subjectName}
              </span>
            </span>
          </Link>
          <StatusBadge status={displayStatus} />
        </div>

        <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-zinc-100 pt-5 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2.5">
            <CalendarPlus size={16} className="shrink-0 text-zinc-400" aria-hidden="true" />
            <div>
              <dt className="text-xs text-zinc-500">{tW("date")}</dt>
              <dd className="font-semibold text-zinc-900">
                {formatFullDate(start, locale)}
              </dd>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock size={16} className="shrink-0 text-zinc-400" aria-hidden="true" />
            <div>
              <dt className="text-xs text-zinc-500">
                {tW("time")} · {tW("timezoneShort")}
              </dt>
              <dd className="font-semibold text-zinc-900">
                {formatTime(start, locale)}–{formatTime(end, locale)} (
                {tW("durationValue", { min: booking.duration_min })})
              </dd>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Wallet size={16} className="shrink-0 text-zinc-400" aria-hidden="true" />
            <div>
              <dt className="text-xs text-zinc-500">{tW("price")}</dt>
              <dd className="font-semibold text-zinc-900">
                {booking.price === 0
                  ? tW("free")
                  : tUi("price", { price: formatUzs(booking.price, locale) })}
              </dd>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <GraduationCap size={16} className="shrink-0 text-zinc-400" aria-hidden="true" />
            <div>
              <dt className="text-xs text-zinc-500">{tW("subject")}</dt>
              <dd className="font-semibold text-zinc-900">{subjectName}</dd>
            </div>
          </div>
        </dl>
      </Card>

      {/* Review — completed lesson, student viewer */}
      {booking.status === "completed" && !isTeacherViewer && (
        <Card className="mt-6 p-5 sm:p-6">
          {booking.review ? (
            <div className="flex flex-col items-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-50 text-accent-500">
                <Star
                  size={24}
                  fill="currentColor"
                  strokeWidth={0}
                  aria-hidden="true"
                />
              </span>
              <p className="mt-3 font-bold text-zinc-900">
                {t("reviewThanksTitle")}
              </p>
              <p className="mt-1 text-sm text-zinc-500">{t("reviewThanksBody")}</p>
              <div
                className="mt-3 flex gap-1"
                aria-label={`${booking.review.stars} / 5`}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    size={20}
                    aria-hidden="true"
                    className={
                      n <= (booking.review?.stars ?? 0)
                        ? "text-accent-500"
                        : "text-zinc-200"
                    }
                    fill="currentColor"
                    strokeWidth={0}
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold tracking-tight text-zinc-900">
                {t("reviewSectionTitle")}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">{t("reviewSectionBody")}</p>
              <div className="mt-4">
                <ReviewForm
                  bookingId={booking.id}
                  teacherId={booking.teacher_id}
                  studentId={booking.student_id}
                  onReviewed={(stars) =>
                    setBooking({ ...booking, review: { stars } })
                  }
                />
              </div>
            </>
          )}
        </Card>
      )}

      {/* Status panel — the "awaiting payment" case renders its own checkout
          layout above (early return), so only the paid panel remains here. */}
      {displayStatus === "paid" && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-bold text-emerald-800">{t("paidTitle")}</p>
          <p className="mt-1 text-sm text-emerald-700">
            {booking.kind === "trial_free" ? t("trialPaidBody") : t("paidBody")}
          </p>
        </div>
      )}

      {/* Lesson (Google Meet link + join + teacher completes) */}
      {(booking.status === "paid" || booking.status === "in_progress") && (
        <LessonPanel
          bookingId={booking.id}
          isTeacher={isTeacherViewer}
          startAtMs={start.getTime()}
          initialMeetingUrl={booking.lesson?.meeting_url ?? null}
          onCompleted={() => void load()}
        />
      )}

      {cancelled && booking.cancel_reason && (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600">
          {t("cancelledReason", { reason: booking.cancel_reason })}
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <ButtonLink variant="ghost" href="/cabinet/lessons">
          <ChevronLeft size={16} aria-hidden="true" />
          {t("myLessons")}
        </ButtonLink>
        {showSuccess && (
          <Button variant="secondary" onClick={addToCalendar}>
            <CalendarPlus size={16} aria-hidden="true" />
            {t("addToCalendar")}
          </Button>
        )}
        {!isTeacherViewer && booking.teacher?.slug && (
          <ContactTeacherButton
            teacherId={booking.teacher_id}
            teacherSlug={booking.teacher.slug}
          >
            {t("messageTeacher")}
          </ContactTeacherButton>
        )}
        {cancellable && (
          <Button
            variant="ghost"
            className="border border-red-300 text-red-600 hover:border-red-400 hover:bg-red-50 active:bg-red-100"
            onClick={() => {
              setCancelError(false);
              setCancelOpen(true);
            }}
          >
            {t("cancel")}
          </Button>
        )}
      </div>

      {/* Cancel modal */}
      <Modal
        open={cancelOpen}
        onClose={() => !cancelling && setCancelOpen(false)}
        title={t("cancelTitle")}
      >
        <p className="text-sm leading-relaxed text-zinc-600">{cancelNote}</p>
        <Textarea
          label={t("cancelReason")}
          rows={3}
          maxLength={500}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          wrapperClassName="mt-4"
        />
        {cancelError && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {t("cancelError")}
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2.5">
          <Button
            variant="ghost"
            disabled={cancelling}
            onClick={() => setCancelOpen(false)}
          >
            {t("cancelKeep")}
          </Button>
          <Button variant="danger" loading={cancelling} onClick={doCancel}>
            {t("cancelConfirm")}
          </Button>
        </div>
      </Modal>
    </main>
  );
}
