"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatUzs, type Locale } from "@ustoz/shared";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { formatFullDate, formatTime } from "@/lib/datetime";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBookingSelection } from "./booking-context";
import { AvailabilityCalendar } from "./availability-calendar";

export type BookingSubject = {
  /** teacher_subjects.id */
  id: string;
  nameUz: string;
  nameRu: string;
  price30: number | null;
  price60: number;
  price90: number | null;
  trialFree: boolean;
};

type DurationChoice = {
  kind: "regular" | "trial_free";
  min: 20 | 30 | 60 | 90;
};

/** Maps booking-create error codes to i18n keys; anything unknown → generic. */
const ERROR_KEY: Record<string, string> = {
  SLOT_TAKEN: "errSlotTaken",
  TRIAL_USED: "errTrialUsed",
  TEACHER_LIMIT: "errTeacherLimit",
};

async function extractErrorCode(error: unknown): Promise<string> {
  const ctx = (error as { context?: unknown } | null)?.context;
  if (typeof Response !== "undefined" && ctx instanceof Response) {
    try {
      const body = (await ctx.clone().json()) as {
        error?: { code?: string };
      } | null;
      if (body?.error?.code) return body.error.code;
    } catch {
      /* non-JSON body */
    }
  }
  return "UNKNOWN";
}

/**
 * 4-step booking wizard: subject → duration → day & slot → confirmation.
 * Lives on the teacher profile page under #booking.
 */
export function BookingWidget({
  teacherId,
  teacherSlug,
  teacherName,
  subjects,
}: {
  teacherId: string;
  teacherSlug: string;
  teacherName: string;
  subjects: BookingSubject[];
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations("Booking.widget");
  const tUi = useTranslations("Ui");
  const router = useRouter();

  const { subjectId, selectSubject } = useBookingSelection();
  const subject = subjects.find((s) => s.id === subjectId) ?? null;

  // Downstream choices are stored together with the upstream key they were
  // made for — changing the subject/duration invalidates them by derivation
  // (no effect-based resets).
  const [durationSel, setDurationSel] = useState<{
    forSubject: string;
    choice: DurationChoice;
  } | null>(null);
  const duration =
    subject && durationSel?.forSubject === subject.id
      ? durationSel.choice
      : null;

  const slotScope = subject && duration ? `${subject.id}|${duration.kind}|${duration.min}` : "";
  const [slotSel, setSlotSel] = useState<{ scope: string; iso: string } | null>(
    null,
  );
  const slot = slotScope && slotSel?.scope === slotScope ? slotSel.iso : null;

  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  const pickDuration = (choice: DurationChoice) => {
    if (!subject) return;
    setDurationSel({ forSubject: subject.id, choice });
    setErrorKey(null);
  };
  const pickSlot = (iso: string) => {
    setSlotSel({ scope: slotScope, iso });
    setErrorKey(null);
  };

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setAuthed(Boolean(data.session));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(Boolean(session));
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const subjectName = (s: BookingSubject) =>
    locale === "ru" ? s.nameRu : s.nameUz;

  const price = (() => {
    if (!subject || !duration) return null;
    if (duration.kind === "trial_free") return 0;
    const byMin: Record<number, number | null> = {
      30: subject.price30,
      60: subject.price60,
      90: subject.price90,
    };
    return byMin[duration.min] ?? null;
  })();

  const step = !subject ? 1 : !duration ? 2 : !slot ? 3 : 4;

  const submit = async () => {
    if (!subject || !duration || !slot) return;
    setSubmitting(true);
    setErrorKey(null);
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke("booking-create", {
      body: {
        teacherSubjectId: subject.id,
        startAt: new Date(slot).toISOString(),
        durationMin: duration.min,
        kind: duration.kind,
      },
    });
    if (error) {
      const code = await extractErrorCode(error);
      if (code === "UNAUTHENTICATED") {
        router.push(`/auth?next=${encodeURIComponent(`/t/${teacherSlug}`)}`);
        return;
      }
      if (code === "SLOT_TAKEN") {
        setSlotSel(null);
        setRefreshKey((k) => k + 1);
      }
      setErrorKey(ERROR_KEY[code] ?? "errGeneric");
      setSubmitting(false);
      return;
    }
    const bookingId = (data as { booking?: { id?: string } } | null)?.booking?.id;
    if (bookingId) {
      router.push(`/booking/${bookingId}`);
      return; // keep the spinner while navigating
    }
    setErrorKey("errGeneric");
    setSubmitting(false);
  };

  const steps = [
    { n: 1, label: t("stepSubject") },
    { n: 2, label: t("stepDuration") },
    { n: 3, label: t("stepTime") },
    { n: 4, label: t("stepConfirm") },
  ];

  const durations: DurationChoice[] = [
    ...(subject?.price30 ? [{ kind: "regular", min: 30 } as const] : []),
    ...(subject ? [{ kind: "regular", min: 60 } as const] : []),
    ...(subject?.price90 ? [{ kind: "regular", min: 90 } as const] : []),
  ];

  const fmtPrice = (tiyin: number) =>
    tUi("price", { price: formatUzs(tiyin, locale) });

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      {/* Step indicator */}
      <ol className="flex items-center gap-1.5 sm:gap-2" aria-hidden="true">
        {steps.map((s, i) => {
          const done = step > s.n;
          const active = step === s.n;
          return (
            <li key={s.n} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  done
                    ? "bg-brand-100 text-brand-700"
                    : active
                      ? "bg-brand-600 text-white"
                      : "bg-zinc-100 text-zinc-400",
                )}
              >
                {done ? <Check size={14} /> : s.n}
              </span>
              <span
                className={cn(
                  "hidden truncate text-xs font-semibold sm:block",
                  active ? "text-zinc-900" : "text-zinc-400",
                )}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <span className="h-px flex-1 bg-zinc-200" />
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-6 space-y-6">
        <div className="grid items-start gap-6 sm:grid-cols-2">

      {/* Step 1 — subject */}
      <section>
        <h3 className="text-sm font-bold text-zinc-900">
          1. {t("stepSubject")}
          <span className="ml-2 font-normal text-zinc-400">
            {t("subjectPrompt")}
          </span>
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {subjects.map((s) => {
            const active = s.id === subjectId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => selectSubject(s.id)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-600",
                  active
                    ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                    : "border-zinc-200 bg-white text-zinc-800 hover:border-brand-400 hover:bg-brand-50",
                )}
              >
                {subjectName(s)}
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 2 — duration */}
      {subject && (
        <section>
          <h3 className="text-sm font-bold text-zinc-900">
            2. {t("stepDuration")}
            <span className="ml-2 font-normal text-zinc-400">
              {t("durationPrompt")}
            </span>
          </h3>
          <div className="mt-3 space-y-2">
            {subject.trialFree && (
              <button
                type="button"
                onClick={() => pickDuration({ kind: "trial_free", min: 20 })}
                aria-pressed={duration?.kind === "trial_free"}
                className={cn(
                  "flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-600",
                  duration?.kind === "trial_free"
                    ? "border-accent-500 ring-1 ring-accent-500"
                    : "border-accent-200 bg-accent-50/40 hover:border-accent-400",
                )}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-bold text-zinc-900">
                    <Sparkles size={14} className="text-accent-500" aria-hidden="true" />
                    {t("trialOption")}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    {t("trialOnce")}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-bold text-accent-600">
                    {t("free")}
                  </span>
                  <Radio active={duration?.kind === "trial_free"} accent />
                </span>
              </button>
            )}
            {durations.map((d) => {
              const active =
                duration?.kind === d.kind && duration?.min === d.min;
              const byMin: Record<number, number | null> = {
                30: subject.price30,
                60: subject.price60,
                90: subject.price90,
              };
              return (
                <button
                  key={d.min}
                  type="button"
                  onClick={() => pickDuration(d)}
                  aria-pressed={active}
                  className={cn(
                    "flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-600",
                    active
                      ? "border-brand-600 ring-1 ring-brand-600"
                      : "border-zinc-200 bg-white hover:border-brand-300",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-zinc-900">
                      {t("durationValue", { min: d.min })}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-zinc-500">
                      {subjectName(subject)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-bold text-zinc-900">
                      {fmtPrice(byMin[d.min] ?? 0)}
                    </span>
                    <Radio active={active} />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}
        </div>

      {/* Step 3 — day & slot */}
      {subject && duration && (
        <section>
          <h3 className="text-sm font-bold text-zinc-900">
            3. {t("stepTime")}
            <span className="ml-2 font-normal text-zinc-400">
              {t("slotPrompt")}
            </span>
          </h3>
          <div className="mt-3">
            <AvailabilityCalendar
              teacherId={teacherId}
              durationMin={duration.min}
              value={slot}
              onSelect={pickSlot}
              refreshKey={refreshKey}
            />
          </div>
        </section>
      )}

      {/* Step 4 — confirmation */}
      {subject && duration && slot && (
        <section>
          <h3 className="text-sm font-bold text-zinc-900">
            4. {t("stepConfirm")}
          </h3>
          <div className="mt-3 rounded-2xl bg-zinc-50 p-4 sm:p-5">
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-4 sm:block">
                <dt className="text-zinc-500">{t("teacher")}</dt>
                <dd className="font-semibold text-zinc-900">{teacherName}</dd>
              </div>
              <div className="flex justify-between gap-4 sm:block">
                <dt className="text-zinc-500">{t("subject")}</dt>
                <dd className="font-semibold text-zinc-900">
                  {subjectName(subject)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 sm:block">
                <dt className="text-zinc-500">{t("date")}</dt>
                <dd className="font-semibold text-zinc-900">
                  {formatFullDate(new Date(slot), locale)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 sm:block">
                <dt className="text-zinc-500">{t("time")}</dt>
                <dd className="font-semibold text-zinc-900">
                  {formatTime(new Date(slot), locale)}–
                  {formatTime(
                    new Date(new Date(slot).getTime() + duration.min * 60_000),
                    locale,
                  )}
                  <span className="ml-1.5 font-normal text-zinc-400">
                    · {t("timezoneShort")}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between gap-4 sm:block">
                <dt className="text-zinc-500">{t("duration")}</dt>
                <dd className="font-semibold text-zinc-900">
                  {t("durationValue", { min: duration.min })}
                </dd>
              </div>
              <div className="flex justify-between gap-4 sm:block">
                <dt className="text-zinc-500">{t("price")}</dt>
                <dd className="font-bold text-zinc-900">
                  {duration.kind === "trial_free" ? (
                    <span className="inline-flex items-center gap-1.5">
                      {t("free")}
                      <Badge variant="trial" />
                    </span>
                  ) : (
                    fmtPrice(price ?? 0)
                  )}
                </dd>
              </div>
            </dl>

            <div className="mt-4 rounded-xl bg-white p-3 text-xs leading-relaxed text-zinc-500">
              <span className="font-semibold text-zinc-700">
                {t("policyTitle")}:
              </span>{" "}
              {t("policyBody")}
            </div>

            {errorKey && (
              <p
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"
              >
                <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                {t(errorKey)}
              </p>
            )}

            <div className="mt-4">
              {authed === false ? (
                <ButtonLink
                  href={`/auth?next=${encodeURIComponent(`/t/${teacherSlug}`)}`}
                  size="lg"
                  className="w-full"
                >
                  {t("signInToBook")}
                </ButtonLink>
              ) : (
                <Button
                  size="lg"
                  className="w-full"
                  loading={submitting}
                  disabled={authed === null}
                  onClick={submit}
                >
                  {t("confirm")}
                </Button>
              )}
            </div>
          </div>
        </section>
      )}
      </div>
    </div>
  );
}

function Radio({ active, accent = false }: { active: boolean; accent?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
        active ? (accent ? "border-accent-500" : "border-brand-600") : "border-zinc-300",
      )}
    >
      {active && (
        <span
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            accent ? "bg-accent-500" : "bg-brand-600",
          )}
        />
      )}
    </span>
  );
}
