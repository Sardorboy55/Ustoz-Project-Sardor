"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Lock,
  ReceiptText,
  Settings2,
  Snowflake,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatUzs, type Locale, type WalletTxType } from "@ustoz/shared";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { formatDayMonth, formatTime } from "@/lib/datetime";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Price } from "@/components/ui/price";
import { Skeleton } from "@/components/ui/skeleton";
import { useCabinet } from "@/components/cabinet/cabinet-shell";

type WalletRow = { balance: number; frozen: number };
type TxRow = {
  id: string;
  type: WalletTxType;
  amount: number;
  comment: string | null;
  created_at: string;
};
type PayoutRow = {
  id: string;
  amount: number;
  card_number: string;
  status: "pending" | "approved" | "paid" | "rejected";
  admin_comment: string | null;
  created_at: string;
};

const MIN_PAYOUT_UZS = 50_000;

const PAYOUT_BADGE: Record<PayoutRow["status"], BadgeVariant> = {
  pending: "warning",
  approved: "neutral",
  paid: "success",
  rejected: "danger",
};

export function TeacherWallet() {
  const t = useTranslations("Cabinet.teacher");
  const tCommon = useTranslations("Cabinet.common");
  const locale = useLocale() as Locale;
  const { userId } = useCabinet();

  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [wallet, setWallet] = useState<WalletRow>({ balance: 0, frozen: 0 });
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);

  const [payoutOpen, setPayoutOpen] = useState(false);
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [walletRes, txRes, payoutRes] = await Promise.all([
      supabase
        .from("wallets")
        .select("balance, frozen")
        .eq("teacher_id", userId)
        .maybeSingle(),
      supabase
        .from("wallet_transactions")
        .select("id, type, amount, comment, created_at")
        .eq("teacher_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("payout_requests")
        .select("id, amount, card_number, status, admin_comment, created_at")
        .eq("teacher_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    if (walletRes.error || txRes.error || payoutRes.error) {
      setPhase("error");
      return;
    }
    setWallet((walletRes.data ?? { balance: 0, frozen: 0 }) as WalletRow);
    setTxs((txRes.data ?? []) as TxRow[]);
    setPayouts((payoutRes.data ?? []) as PayoutRow[]);
    setPhase("ready");
  }, [userId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  if (phase === "loading") {
    return (
      <div aria-busy="true" className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (phase === "error") {
    return <ErrorState description={tCommon("loadError")} onRetry={() => void load()} />;
  }

  const txAmountClass = (amount: number) =>
    amount > 0 ? "text-emerald-600" : amount < 0 ? "text-zinc-900" : "text-zinc-500";

  return (
    <div className="max-w-3xl space-y-5">
      {/* Balances */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {t("walletBalance")}
            </p>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Banknote size={18} aria-hidden="true" />
            </span>
          </div>
          <Price tiyin={wallet.balance} className="mt-1 text-3xl font-bold" />
          <Button
            size="sm"
            className="mt-4"
            disabled={wallet.balance < MIN_PAYOUT_UZS * 100}
            onClick={() => {
              setSuccess(false);
              setPayoutOpen(true);
            }}
          >
            {t("payoutCta")}
          </Button>
          {success && (
            <p className="mt-3 text-sm font-medium text-brand-700">
              {t("payoutSuccess")}
            </p>
          )}
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {t("walletFrozen")}
            </p>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sky-600">
              <Snowflake size={18} aria-hidden="true" />
            </span>
          </div>
          <Price tiyin={wallet.frozen} className="mt-1 text-3xl font-bold" />
          {wallet.frozen > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
              <Lock size={13} aria-hidden="true" />
              {t("frozenHint")}
            </p>
          )}
        </Card>
      </div>

      {/* Payout requests */}
      {payouts.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            {t("payoutsTitle")}
          </h2>
          <ul className="mt-3 space-y-2">
            {payouts.map((p) => {
              const when = new Date(p.created_at);
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-zinc-200 bg-white p-4"
                >
                  <div className="min-w-0 flex-1">
                    <Price tiyin={p.amount} className="text-sm" />
                    <p className="text-xs text-zinc-400">
                      •••• {p.card_number.slice(-4)} ·{" "}
                      {formatDayMonth(when, locale)}, {formatTime(when, locale)}
                    </p>
                    {p.admin_comment && (
                      <p className="mt-0.5 text-xs text-zinc-500">{p.admin_comment}</p>
                    )}
                  </div>
                  <Badge variant={PAYOUT_BADGE[p.status]}>
                    {t(`payoutStatuses.${p.status}`)}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Wallet history */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          {t("txTitle")}
        </h2>
        <div className="mt-3">
          {txs.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
              {t("noTx")}
            </p>
          ) : (
            <ul className="space-y-2">
              {txs.map((tx) => {
                const when = new Date(tx.created_at);
                const Icon =
                  tx.type === "lesson_income"
                    ? ArrowDownLeft
                    : tx.type === "admin_adjust"
                      ? Settings2
                      : tx.type === "payout" ||
                          tx.type === "payout_freeze" ||
                          tx.type === "payout_unfreeze"
                        ? ArrowUpRight
                        : ReceiptText;
                return (
                  <li
                    key={tx.id}
                    className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4"
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                        tx.amount > 0
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-zinc-100 text-zinc-500",
                      )}
                    >
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-900">
                        {t(`txTypes.${tx.type}`)}
                      </p>
                      {tx.comment && (
                        <p className="truncate text-xs text-zinc-500">{tx.comment}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={cn("text-sm font-bold", txAmountClass(tx.amount))}>
                        {tx.amount > 0 ? "+" : tx.amount < 0 ? "−" : ""}
                        {formatUzs(Math.abs(tx.amount), locale)}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {formatDayMonth(when, locale)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <PayoutModal
        open={payoutOpen}
        balance={wallet.balance}
        onClose={() => setPayoutOpen(false)}
        onDone={async () => {
          setPayoutOpen(false);
          setSuccess(true);
          await load();
        }}
      />
    </div>
  );
}

function PayoutModal({
  open,
  balance,
  onClose,
  onDone,
}: {
  open: boolean;
  balance: number;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const t = useTranslations("Cabinet.teacher");
  const [amount, setAmount] = useState("");
  const [card, setCard] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const amountUzs = Number(amount.replace(/\D/g, "")) || 0;
  const cardDigits = card.replace(/\D/g, "");

  const validate = (): string | null => {
    if (amountUzs < MIN_PAYOUT_UZS) return "payoutErrMin";
    if (amountUzs * 100 > balance) return "payoutErrBalance";
    if (!/^\d{16}$/.test(cardDigits)) return "payoutErrCard";
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) {
      setErrorKey(err);
      return;
    }
    setBusy(true);
    setErrorKey(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("wallet_request_payout", {
      p_amount: amountUzs * 100,
      p_card_number: cardDigits,
    });
    setBusy(false);
    if (error) {
      const msg = error.message ?? "";
      setErrorKey(
        msg.includes("PAYOUT_BELOW_MIN")
          ? "payoutErrMin"
          : msg.includes("INSUFFICIENT_BALANCE")
            ? "payoutErrBalance"
            : msg.includes("INVALID_CARD_NUMBER")
              ? "payoutErrCard"
              : "payoutErrGeneric",
      );
      return;
    }
    setAmount("");
    setCard("");
    await onDone();
  };

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title={t("payoutTitle")}>
      <Input
        label={t("payoutAmount")}
        helper={t("payoutAmountHelper")}
        inputMode="numeric"
        value={amount}
        onChange={(e) => {
          setAmount(e.target.value.replace(/\D/g, ""));
          setErrorKey(null);
        }}
      />
      <Input
        label={t("payoutCard")}
        helper={t("payoutCardHelper")}
        inputMode="numeric"
        maxLength={19}
        value={card}
        onChange={(e) => {
          // group as 0000 0000 0000 0000 while typing
          const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
          setCard(digits.replace(/(\d{4})(?=\d)/g, "$1 "));
          setErrorKey(null);
        }}
        wrapperClassName="mt-4"
      />
      {errorKey && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {t(errorKey)}
        </p>
      )}
      <div className="mt-5 flex justify-end">
        <Button
          loading={busy}
          disabled={amountUzs < MIN_PAYOUT_UZS || cardDigits.length !== 16}
          onClick={submit}
        >
          {t("payoutSubmit")}
        </Button>
      </div>
    </Modal>
  );
}
