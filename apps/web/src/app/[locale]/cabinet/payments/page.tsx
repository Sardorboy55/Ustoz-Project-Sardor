"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Price } from "@/components/ui/price";
import { Skeleton } from "@/components/ui/skeleton";
import { useCabinet } from "@/components/cabinet/cabinet-shell";
import { TopUpModal } from "@/components/cabinet/topup-modal";

type BalanceTx = {
  id: string;
  type: "refund_in" | "booking_spend" | "admin_adjust" | "topup";
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

export default function PaymentsPage() {
  const t = useTranslations("Cabinet.payments");
  const tCommon = useTranslations("Cabinet.common");
  const locale = useLocale() as Locale;
  const { userId, profile, refreshProfile } = useCabinet();

  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [txs, setTxs] = useState<BalanceTx[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [topupOpen, setTopupOpen] = useState(false);

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
    type === "refund_in" || type === "topup" ? (
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

      {/* Balance */}
      <Card className="flex flex-col p-5 sm:max-w-md">
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
        <p className="mt-2 mb-4 text-xs leading-relaxed text-zinc-500">
          {t("balanceNote")}
        </p>
        <Button
          variant="primary"
          size="sm"
          className="mt-auto w-full"
          onClick={() => setTopupOpen(true)}
        >
          <Plus size={16} aria-hidden="true" />
          {t("topup")}
        </Button>
      </Card>

      <TopUpModal
        open={topupOpen}
        onClose={() => setTopupOpen(false)}
        onToppedUp={() => {
          void refreshProfile();
          void load();
        }}
      />

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
