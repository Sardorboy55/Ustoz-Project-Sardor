"use client";

import { useMemo, useState } from "react";
import { Check, Package, Wallet } from "lucide-react";
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
 * duration and a pack size (5/10/20); the discounted total is paid from their
 * balance via student_buy_package, crediting lessons they later spend on
 * bookings. Online card payment tops up the same balance (coming soon).
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
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"idle" | "done" | "balance" | "error">("idle");

  const durations = useMemo(
    () => ([30, 60, 90] as const).filter((d) => (prices[d] ?? 0) > 0),
    [prices],
  );

  const total = (d: 30 | 60 | 90, n: 5 | 10 | 20) =>
    Math.round(((prices[d] ?? 0) * n * (100 - discounts[n])) / 100);

  const buy = async () => {
    setBusy(true);
    setState("idle");
    const supabase = createClient();
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      router.push("/auth");
      return;
    }
    const { error } = await supabase.rpc("student_buy_package", {
      p_teacher_subject_id: teacherSubjectId,
      p_lessons: size,
      p_duration_min: duration,
    });
    setBusy(false);
    if (error) {
      setState(error.message.includes("INSUFFICIENT_BALANCE") ? "balance" : "error");
      return;
    }
    setState("done");
  };

  const reset = () => {
    setOpen(false);
    setState("idle");
  };

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
        size="lg"
      >
        {state === "done" ? (
          <div className="py-4 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Check size={28} aria-hidden="true" />
            </span>
            <p className="mt-3 text-lg font-bold text-zinc-900">Пакет куплен!</p>
            <p className="mt-1 text-sm text-zinc-600">
              {size} уроков по {duration} мин зачислены. Бронируйте занятия — они
              спишутся из пакета.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Link
                href="/cabinet/packages"
                className="text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
              >
                Мои пакеты
              </Link>
            </div>
            <Button className="mt-4 w-full" onClick={reset}>
              Готово
            </Button>
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

            {state === "balance" && (
              <p className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                <Wallet size={15} aria-hidden="true" />
                Недостаточно средств на балансе.
                <Link
                  href="/cabinet"
                  className="font-semibold underline underline-offset-2"
                >
                  Пополнить баланс
                </Link>
              </p>
            )}
            {state === "error" && (
              <p role="alert" className="mt-4 text-sm text-red-600">
                Не удалось купить пакет. Попробуйте ещё раз.
              </p>
            )}

            <Button
              className="mt-5 w-full"
              size="lg"
              loading={busy}
              onClick={buy}
            >
              Купить за {formatUzs(total(duration, size), locale)} сум
            </Button>
            <p className="mt-2 text-center text-xs text-zinc-400">
              Оплата с баланса. Картой (Click/Payme/Uzum) — скоро.
            </p>
          </>
        )}
      </Modal>
    </>
  );
}
