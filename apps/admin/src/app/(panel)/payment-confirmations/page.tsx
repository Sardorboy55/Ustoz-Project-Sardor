"use client";

// Оплаты по QR: очередь чеков на подтверждение. Админ сверяет скрин чека со
// счётом Paynet и подтверждает → бронь оплачивается, деньги сразу падают на
// баланс преподавателя (минус эквайринг). Отклонение — без начисления.

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, BadgeCheck, Check, Receipt, X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { formatDateTime, formatSum } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  Skeleton,
  Textarea,
  useToast,
} from "@/components/ui";

type Payment = {
  id: string;
  booking_id: string | null;
  student_id: string;
  purpose: string;
  amount: number;
  receipt_path: string | null;
  status: string;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  // обогащение
  studentName: string;
  teacherName: string;
  teacherSlug: string | null;
  studentSlug: string | null;
  subjectName: string;
  startAt: string | null;
};

// Ссылки на публичные профили преподавателей (отдельный домен сайта).
const WEB_URL = "https://ustoz-web-two.vercel.app";

function TeacherLink({ name, slug }: { name: string; slug: string | null }) {
  if (!slug) return <b>{name}</b>;
  return (
    <a
      href={`${WEB_URL}/t/${slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-brand-dark underline-offset-2 hover:underline"
    >
      {name}
    </a>
  );
}

const FIELDS =
  "id, booking_id, student_id, purpose, amount, receipt_path, status, review_note, reviewed_at, created_at";

async function enrich(rows: Payment[]): Promise<Payment[]> {
  const supabase = createClient();
  const bookingIds = Array.from(
    new Set(rows.map((r) => r.booking_id).filter(Boolean) as string[]),
  );
  const bookings = new Map<
    string,
    { teacher_id: string; teacher_subject_id: string; start_at: string }
  >();
  if (bookingIds.length > 0) {
    const { data } = await supabase
      .from("bookings")
      .select("id, teacher_id, teacher_subject_id, start_at")
      .in("id", bookingIds);
    for (const b of data ?? []) bookings.set(b.id, b);
  }

  const subjIds = Array.from(
    new Set(
      Array.from(bookings.values())
        .map((b) => b.teacher_subject_id)
        .filter(Boolean),
    ),
  );
  const subjNames = new Map<string, string>();
  if (subjIds.length > 0) {
    const { data: tsData } = await supabase
      .from("teacher_subjects")
      .select("id, subject_id")
      .in("id", subjIds);
    const subjectIds = Array.from(
      new Set((tsData ?? []).map((t) => t.subject_id as string)),
    );
    const nameById = new Map<string, string>();
    if (subjectIds.length > 0) {
      const { data: sData } = await supabase
        .from("subjects")
        .select("id, name_ru, name_uz")
        .in("id", subjectIds);
      for (const s of sData ?? []) nameById.set(s.id, s.name_ru || s.name_uz || "—");
    }
    for (const t of tsData ?? []) {
      subjNames.set(t.id, nameById.get(t.subject_id as string) || "—");
    }
  }

  const personIds = Array.from(
    new Set([
      ...rows.map((r) => r.student_id),
      ...Array.from(bookings.values()).map((b) => b.teacher_id),
    ]),
  );
  const names = new Map<string, string>();
  if (personIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", personIds);
    for (const p of data ?? []) names.set(p.id, p.full_name);
  }

  // slug профилей преподавателей (для ссылок). У учеников slug нет.
  const slugs = new Map<string, string>();
  if (personIds.length > 0) {
    const { data } = await supabase
      .from("teacher_profiles")
      .select("user_id, slug")
      .in("user_id", personIds);
    for (const t of data ?? []) slugs.set(t.user_id, t.slug);
  }

  return rows.map((r) => {
    const b = r.booking_id ? bookings.get(r.booking_id) : undefined;
    return {
      ...r,
      studentName: names.get(r.student_id) || "—",
      teacherName: b ? names.get(b.teacher_id) || "—" : "—",
      teacherSlug: b ? slugs.get(b.teacher_id) ?? null : null,
      studentSlug: slugs.get(r.student_id) ?? null,
      subjectName: b ? subjNames.get(b.teacher_subject_id) || "—" : "—",
      startAt: b?.start_at ?? null,
    };
  });
}

async function fetchByStatus(statuses: string[]): Promise<Payment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("manual_payments")
    .select(FIELDS)
    .in("status", statuses)
    .order("created_at", { ascending: statuses.includes("pending") })
    .limit(100);
  if (error) throw error;
  return enrich((data ?? []) as Payment[]);
}

async function openReceipt(path: string, toast: (m: string, t?: "error") => void) {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("payment-receipts")
    .createSignedUrl(path, 600);
  if (error || !data?.signedUrl) {
    toast("Не удалось открыть чек.", "error");
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener");
}

export default function PaymentConfirmationsPage() {
  const toast = useToast();
  const [pending, setPending] = useState<Payment[] | null>(null);
  const [resolved, setResolved] = useState<Payment[] | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState(false);

  const [confirm, setConfirm] = useState<{ pay: Payment; approve: boolean } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const retry = useCallback(() => {
    setError(false);
    setPending(null);
    setResolved(null);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchByStatus(["pending"]), fetchByStatus(["confirmed", "rejected"])])
      .then(([p, r]) => {
        if (cancelled) return;
        setPending(p);
        setResolved(r);
        setError(false);
      })
      .catch((e) => {
        console.error("payments load failed:", e);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const closeConfirm = () => {
    setConfirm(null);
    setNote("");
  };

  const decide = async () => {
    if (!confirm) return;
    setBusy(true);
    const supabase = createClient();
    const { error: e } = await supabase.rpc("admin_confirm_payment", {
      p_payment_id: confirm.pay.id,
      p_approve: confirm.approve,
      p_note: note.trim() || null,
    });
    setBusy(false);
    if (e) {
      console.error("confirm failed:", e);
      toast(`Ошибка: ${e.message || "не удалось сохранить"}`, "error");
      return;
    }
    toast(
      !confirm.approve
        ? "Оплата отклонена"
        : confirm.pay.purpose === "pro"
          ? "Оплата подтверждена — Pro активирован"
          : "Оплата подтверждена — деньги начислены преподавателю",
    );
    closeConfirm();
    retry();
  };

  if (error) {
    return (
      <Card>
        <EmptyState
          icon={AlertCircle}
          title="Не удалось загрузить оплаты"
          text="Проверьте соединение и попробуйте ещё раз."
          action={<Button onClick={retry}>Повторить</Button>}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="На подтверждении">
        {pending === null ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <EmptyState
            icon={BadgeCheck}
            title="Оплат на подтверждении нет"
            text="Когда ученик оплатит по QR и пришлёт чек — заявка появится здесь."
          />
        ) : (
          <div className="space-y-4">
            {pending.map((p) => (
              <article key={p.id} className="rounded-2xl border border-zinc-200 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-extrabold text-zinc-900">
                        {formatSum(p.amount)}
                      </span>
                      {p.purpose === "pro" ? (
                        <Badge tone="amber">Pro подписка</Badge>
                      ) : (
                        <Badge tone="sky">{p.subjectName}</Badge>
                      )}
                    </div>
                    {p.purpose === "pro" ? (
                      <p className="mt-1 text-sm text-zinc-600">
                        Платит:{" "}
                        <TeacherLink name={p.studentName} slug={p.studentSlug} /> · за
                        Pro-подписку
                      </p>
                    ) : (
                      <div className="mt-1 space-y-0.5 text-sm">
                        <p className="text-zinc-600">
                          Платит (ученик):{" "}
                          <b className="text-zinc-900">{p.studentName}</b>
                        </p>
                        <p className="text-zinc-600">
                          Получит (преподаватель):{" "}
                          <TeacherLink name={p.teacherName} slug={p.teacherSlug} />
                        </p>
                      </div>
                    )}
                    {p.startAt && (
                      <p className="text-sm text-zinc-500">
                        Урок: {formatDateTime(p.startAt)}
                      </p>
                    )}
                  </div>
                  <span className="whitespace-nowrap text-xs text-zinc-500">
                    Отправлено: {formatDateTime(p.created_at)}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {p.receipt_path ? (
                    <Button
                      variant="secondary"
                      className="px-3 py-1.5 text-sm"
                      onClick={() => openReceipt(p.receipt_path!, toast)}
                    >
                      <Receipt className="h-4 w-4" aria-hidden />
                      Открыть чек
                    </Button>
                  ) : (
                    <span className="text-sm text-amber-600">Чек не приложен</span>
                  )}
                </div>

                <div className="mt-4 flex gap-2 border-t border-zinc-100 pt-4">
                  <Button onClick={() => setConfirm({ pay: p, approve: true })}>
                    <Check className="h-4 w-4" aria-hidden />
                    Подтвердить
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => setConfirm({ pay: p, approve: false })}
                  >
                    <X className="h-4 w-4" aria-hidden />
                    Отклонить
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Card title="Обработанные">
        {resolved === null ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : resolved.length === 0 ? (
          <EmptyState icon={BadgeCheck} title="Истории пока нет" text="Решения появятся здесь." />
        ) : (
          <div className="space-y-2">
            {resolved.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-100 px-4 py-2.5 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-900">{formatSum(p.amount)}</span>
                  <span className="text-zinc-500">
                    {p.purpose === "pro"
                      ? `· Pro · ${p.studentName}`
                      : `· ${p.studentName} → ${p.teacherName}`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={p.status === "confirmed" ? "emerald" : "red"}>
                    {p.status === "confirmed" ? "Подтверждено" : "Отклонено"}
                  </Badge>
                  <span className="whitespace-nowrap text-zinc-400">
                    {formatDateTime(p.reviewed_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={confirm !== null}
        onClose={closeConfirm}
        title={confirm?.approve ? "Подтвердить оплату?" : "Отклонить оплату?"}
        footer={
          <>
            <Button variant="ghost" onClick={closeConfirm}>
              Отмена
            </Button>
            <Button
              variant={confirm?.approve ? "primary" : "danger"}
              loading={busy}
              onClick={decide}
            >
              {confirm?.approve ? "Подтвердить" : "Отклонить"}
            </Button>
          </>
        }
      >
        {confirm && (
          <div className="space-y-3">
            <div className="rounded-xl bg-zinc-50 p-3 text-sm">
              <div className="font-bold text-zinc-900">{formatSum(confirm.pay.amount)}</div>
              <p className="text-zinc-600">
                {confirm.pay.purpose === "pro"
                  ? `${confirm.pay.studentName} · Pro подписка`
                  : `${confirm.pay.studentName} → ${confirm.pay.teacherName} · ${confirm.pay.subjectName}`}
              </p>
            </div>
            {confirm.approve ? (
              <p className="text-sm text-zinc-500">
                Сначала убедитесь, что деньги реально пришли на счёт Paynet.{" "}
                {confirm.pay.purpose === "pro"
                  ? "После подтверждения подписка Pro активируется на 30 дней."
                  : "После подтверждения бронь станет оплаченной, а сумма (минус эквайринг) сразу зачислится на баланс преподавателя."}
              </p>
            ) : (
              <p className="text-sm text-zinc-500">
                Бронь останется неоплаченной. Укажите причину — её увидит ученик.
              </p>
            )}
            <Textarea
              label={confirm.approve ? "Комментарий (необязательно)" : "Причина отказа"}
              placeholder={confirm.approve ? "" : "Например: сумма не совпала / чек не читается"}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
