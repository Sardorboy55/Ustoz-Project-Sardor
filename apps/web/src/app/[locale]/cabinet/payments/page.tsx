"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ReceiptText,
  Settings2,
  Wallet,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatUzs, type Locale } from "@ustoz/shared";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { formatDayMonth, formatTime } from "@/lib/datetime";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Price } from "@/components/ui/price";
import { Skeleton } from "@/components/ui/skeleton";
import { useCabinet } from "@/components/cabinet/cabinet-shell";

type BalanceTx = {
  id: string;
  type: "refund_in" | "booking_spend" | "admin_adjust";
  amount: number;
  comment: string | null;
  created_at: string;
};

type PaymentRow = {
  id: string;
  provider: string;
  amount: number;
  status: "created" | "pending" | "succeeded" | "failed" | "refunded";
  created_at: string;
};

const PAY_METHODS = ["Payme", "Click", "Uzum"] as const;

export default function PaymentsPage() {
  const t = useTranslations("Cabinet.payments");
  const tCommon = useTranslations("Cabinet.common");
  const locale = useLocale() as Locale;
  const { userId, profile } = useCabinet();

  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [txs, setTxs] = useState<BalanceTx[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [txRes, payRes] = await Promise.all([
      supabase
        .from("student_balance_transactions")
        .select("id, type, amount, comment, created_at")
        .eq("student_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("payments")
        .select("id, provider, amount, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (txRes.error || payRes.error) {
      setPhase("error");
      return;
    }
    setTxs((txRes.data ?? []) as BalanceTx[]);
    setPayments((payRes.data ?? []) as PaymentRow[]);
    setPhase("ready");
  }, [userId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const txIcon = (type: BalanceTx["type"]) =>
    type === "refund_in" ? (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <ArrowDownLeft size={18} aria-hidden="true" />
      </span>
    ) : type === "booking_spend" ? (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
        <ArrowUpRight size={18} aria-hidden="true" />
      </span>
    ) : (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
        <Settings2 size={18} aria-hidden="true" />
      </span>
    );

  const signedAmount = (amount: number) =>
    `${amount > 0 ? "+" : amount < 0 ? "−" : ""}${formatUzs(Math.abs(amount), locale)}`;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
        {t("title")}
      </h1>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Balance */}
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {t("balance")}
            </p>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Wallet size={18} aria-hidden="true" />
            </span>
          </div>
          <Price
            tiyin={profile.student_balance}
            className="mt-1 text-3xl font-bold"
          />
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            {t("balanceNote")}
          </p>
        </Card>

        {/* Online payment placeholder */}
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            {t("onlineTitle")}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {PAY_METHODS.map((m) => (
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
            {t("onlineNote")}
          </p>
        </Card>
      </div>

      {phase === "loading" && (
        <div aria-busy="true" className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      )}

      {phase === "error" && (
        <ErrorState description={tCommon("loadError")} onRetry={() => void load()} />
      )}

      {phase === "ready" && txs.length === 0 && payments.length === 0 && (
        <EmptyState
          icon={ReceiptText}
          title={t("emptyTitle")}
          description={t("emptyBody")}
        />
      )}

      {phase === "ready" && txs.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            {t("historyTitle")}
          </h2>
          <ul className="mt-3 space-y-2">
            {txs.map((tx) => {
              const when = new Date(tx.created_at);
              return (
                <li
                  key={tx.id}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4"
                >
                  {txIcon(tx.type)}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900">
                      {t(`txTypes.${tx.type}`)}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {tx.comment || `${formatDayMonth(when, locale)}, ${formatTime(when, locale)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "text-sm font-bold",
                        tx.amount > 0
                          ? "text-emerald-600"
                          : tx.amount < 0
                            ? "text-zinc-900"
                            : "text-zinc-500",
                      )}
                    >
                      {signedAmount(tx.amount)}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {formatDayMonth(when, locale)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {phase === "ready" && payments.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            {t("paymentsTitle")}
          </h2>
          <ul className="mt-3 space-y-2">
            {payments.map((p) => {
              const when = new Date(p.created_at);
              return (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
                    <ReceiptText size={18} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold capitalize text-zinc-900">
                      {p.provider.replace("_", " ")}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {formatDayMonth(when, locale)}, {formatTime(when, locale)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Price tiyin={p.amount} className="text-sm" />
                    <Badge
                      variant={
                        p.status === "succeeded"
                          ? "success"
                          : p.status === "failed"
                            ? "danger"
                            : "neutral"
                      }
                    >
                      {t(`payStatuses.${p.status}`)}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
