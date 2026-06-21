"use client";

import { useMemo, useRef, useState } from "react";
import { BadgeCheck, Package, Paperclip, QrCode } from "lucide-react";
import { useLocale } from "next-intl";
import { formatUzs, type Locale } from "@ustoz/shared";
import { useRouter, Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Prices = { 30: number | null; 60: number | null; 90: number | null };
type Discounts = { 5: number; 10: number; 20: number };

/**
 * "Buy a lesson package" flow on the teacher profile. The student picks a
 * duration and a pack size (5/10/20), then pays the discounted total via the
 * Paynet QR (manual confirmation) — same as single lessons / Pro. On admin/SMS
 * confirmation the package (lessons_left) is credited; no balance needed.
 */
export function PackagePicker({
  teacherSubjectId,
  subjectName,
  prices,
  discounts,
}: {
  teacherSubjectId: string;
  subjectName: string;
  prices: Prices;
  discounts: Discounts;
}) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState<30 | 60 | 90>(60);
  const [size, setSize] = useState<5 | 10 | 20>(5);
  const [step, setStep] = useState<"select" | "pay" | "sent">("select");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<number | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const durations = useMemo(
    () => ([30, 60, 90] as const).filter((d) => (prices[d] ?? 0) > 0),
    [prices],
  );

  const total = (d: 30 | 60 | 90, n: 5 | 10 | 20) =>
    Math.round(((prices[d] ?? 0) * n * (100 - discounts[n])) / 100);

  // Создаём платёж за пакет (уникальная сумма) и переходим к QR.
  const goPay = async () => {
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth");
      return;
    }
    setUid(user.id);
    const { data, error } = await supabase.rpc("ensure_package_payment", {
      p_teacher_subject_id: teacherSubjectId,
      p_lessons: size,
      p_duration_min: duration,
    });
    setBusy(false);
    if (error) {
      setErr("Не удалось оформить пакет. Попробуйте ещё раз.");
      return;
    }
    const row = (Array.isArray(data) ? data[0] : data) as
      | { pay_amount: number | null; receipt_path: string | null }
      | null;
    setPayAmount(row?.pay_amount ?? null);
    setStep(row?.receipt_path ? "sent" : "pay");
  };

  const onReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file || !uid) return;
    if (file.size > 10 * 1024 * 1024) {
      setErr("Файл больше 10 МБ.");
      return;
    }
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const path = `${uid}/${crypto.randomUUID()}-${safe}`;
    const { error: upErr } = await supabase.storage
      .from("payment-receipts")
      .upload(path, file, { upsert: false });
    if (upErr) {
      setBusy(false);
      setErr("Не удалось загрузить файл.");
      return;
    }
    const { error: rpcErr } = await supabase.rpc("submit_package_payment", {
      p_receipt_path: path,
    });
    setBusy(false);
    if (rpcErr) {
      setErr("Не удалось отправить чек. Попробуйте ещё раз.");
      return;
    }
    setStep("sent");
  };

  const reset = () => {
    setOpen(false);
    setStep("select");
    setErr(null);
    setPayAmount(null);
  };

  // Точная сумма с уникальным кодом (целые сумы) — её платят «ровно».
  const payLabel =
    payAmount != null
      ? `${Math.round(payAmount / 100).toLocaleString("ru-RU")} сум`
      : `${formatUzs(total(duration, size), locale)} сум`;

  return (
    <>
      <Button
        variant="secondary"
        className="mt-2 w-full"
        onClick={() => setOpen(true)}
      >
        <Package size={16} aria-hidden="true" />
        Купить пакет уроков
      </Button>

      <Modal
        open={open}
        onClose={reset}
        title={`Пакет уроков · ${subjectName}`}
        size="2xl"
      >
        {step === "sent" ? (
          <div className="py-4 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <BadgeCheck size={28} aria-hidden="true" />
            </span>
            <p className="mt-3 text-lg font-bold text-zinc-900">
              Оплата на проверке
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              Как только подтвердим поступление, {size} уроков по {duration} мин
              зачислятся в «Мои пакеты».
            </p>
            <Link
              href="/cabinet/packages"
              className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline"
            >
              Мои пакеты
            </Link>
            <Button className="mt-4 w-full" onClick={reset}>
              Готово
            </Button>
          </div>
        ) : step === "pay" ? (
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <QrCode size={18} className="text-brand-600" aria-hidden="true" />
              <p className="text-sm font-bold text-zinc-900">
                Оплата через Paynet
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/paynet-qr.png"
              alt="QR Paynet"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
              className="mx-auto mt-4 h-44 w-44 rounded-2xl border border-zinc-200 bg-white object-contain"
            />
            <p className="mt-3 text-sm text-zinc-700">
              Отсканируйте QR в <span className="font-semibold">Paynet</span> (или
              оплатите на счёт ниже){" "}
              <span className="font-semibold text-brand-700">
                ровно на {payLabel}
              </span>
              .
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Оплатите ровно эту сумму — по ней мы найдём ваш платёж.
            </p>
            <div className="mt-3 rounded-xl bg-zinc-50 px-3 py-2.5 text-left text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-zinc-500">Получатель</span>
                <span className="font-semibold text-zinc-900">TEMUR BASHIROV</span>
              </div>
              <div className="mt-1 flex justify-between gap-2">
                <span className="text-zinc-500">Счёт</span>
                <span className="font-mono font-semibold text-zinc-900">
                  8888012884806485
                </span>
              </div>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={onReceipt}
              className="hidden"
            />
            <Button
              className="mt-4 w-full"
              loading={busy}
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip size={16} aria-hidden="true" />
              Я оплатил — загрузить чек
            </Button>
            {err && (
              <p role="alert" className="mt-2 text-sm font-medium text-red-600">
                {err}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setStep("select");
                setErr(null);
              }}
              className="mt-3 text-sm text-zinc-500 outline-none transition hover:text-zinc-800"
            >
              ← Изменить пакет
            </button>
          </div>
        ) : (
          <>
            {/* Duration */}
            <p className="text-sm font-medium text-zinc-700">Длительность урока</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {durations.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm font-medium outline-none transition",
                    duration === d
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-zinc-200 text-zinc-600 hover:border-brand-300",
                  )}
                >
                  {d} мин
                </button>
              ))}
            </div>

            {/* Pack size */}
            <p className="mt-4 text-sm font-medium text-zinc-700">Сколько уроков</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {([5, 10, 20] as const).map((n) => {
                const sum = total(duration, n);
                const per = n > 0 ? Math.round(sum / n) : 0;
                const active = size === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSize(n)}
                    className={cn(
                      "rounded-2xl border p-3 text-left outline-none transition",
                      active
                        ? "border-brand-600 bg-brand-50"
                        : "border-zinc-200 hover:border-brand-300",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-zinc-900">
                        {n} уроков
                      </span>
                      {discounts[n] > 0 && (
                        <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-bold text-white">
                          −{discounts[n]}%
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">
                      {formatUzs(sum, locale)} сум
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatUzs(per, locale)} сум / урок
                    </p>
                  </button>
                );
              })}
            </div>

            {err && (
              <p role="alert" className="mt-4 text-sm text-red-600">
                {err}
              </p>
            )}

            <Button
              className="mt-5 w-full"
              size="lg"
              loading={busy}
              onClick={goPay}
            >
              Перейти к оплате · {formatUzs(total(duration, size), locale)} сум
            </Button>
            <p className="mt-2 text-center text-xs text-zinc-400">
              Оплата через Paynet QR. Картой (Click/Payme/Uzum) — скоро.
            </p>
          </>
        )}
      </Modal>
    </>
  );
}
