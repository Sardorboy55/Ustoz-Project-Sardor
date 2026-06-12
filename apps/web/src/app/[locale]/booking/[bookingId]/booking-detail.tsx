"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarPlus,
  CalendarX2,
  Check,
  Clock,
  GraduationCap,
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
};

const SELECT = `
  id, kind, status, start_at, duration_min, price, created_at, cancel_reason,
  teacher_id, student_id,
  teacher_subjects ( subjects ( name_uz, name_ru ) ),
  teacher:teacher_profiles!bookings_teacher_id_fkey (
    slug, profiles!teacher_profiles_user_id_fkey ( full_name, avatar_url ) )
`;

const PENDING_TTL_MS = 15 * 60_000;
const CANCEL_WINDOW_H = 12;

const PAY_METHODS = ["Payme", "Click", "Uzum"] as const;

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

  const payLeftMs =
    new Date(booking.created_at).getTime() + PENDING_TTL_MS - nowTs;
  const mm = Math.max(0, Math.floor(payLeftMs / 60_000));
  const ss = Math.max(0, Math.floor((payLeftMs % 60_000) / 1000));
  const countdown = `${mm}:${String(ss).padStart(2, "0")}`;

  const hoursLeft = (start.getTime() - nowTs) / 3_600_000;
  const cancelNote =
    booking.status === "pending_payment"
      ? t("cancelPendingNote")
      : booking.price === 0
        ? t("cancelTrialNote")
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
          <StatusBadge status={booking.status} />
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
          <StatusBadge status={booking.status} />
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

      {/* Status panel */}
      {booking.status === "pending_payment" && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
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

          <div className="mt-4">
            <p className="text-sm font-bold text-zinc-800">{t("paymentTitle")}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[...PAY_METHODS, t("balance")].map((m) => (
                <div
                  key={m}
                  aria-disabled="true"
                  className="flex cursor-not-allowed flex-col items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2 py-3 opacity-70"
                >
                  <span className="text-sm font-bold text-zinc-500">{m}</span>
                  <Badge variant="neutral">{t("soon")}</Badge>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">
              {t("paymentNote")}
            </p>
          </div>
        </div>
      )}

      {booking.status === "paid" && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-bold text-emerald-800">{t("paidTitle")}</p>
          <p className="mt-1 text-sm text-emerald-700">
            {booking.kind === "trial_free" ? t("trialPaidBody") : t("paidBody")}
          </p>
        </div>
      )}

      {cancelled && booking.cancel_reason && (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600">
          {t("cancelledReason", { reason: booking.cancel_reason })}
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-start gap-2.5">
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
        <ButtonLink variant="ghost" href="/cabinet/lessons">
          {t("myLessons")}
        </ButtonLink>
        {cancellable && (
          <Button
            variant="ghost"
            className="text-red-600 hover:bg-red-50 active:bg-red-100"
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
