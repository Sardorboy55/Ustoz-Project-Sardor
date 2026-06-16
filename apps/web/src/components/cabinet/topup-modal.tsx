"use client";

import { useState } from "react";
import { Check, CreditCard, Plus, Trash2, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000]; // UZS

type Method = "payme" | "click" | "uzum" | "card";
type SavedCard = { id: string; brand: string; last4: string };

const onlyDigits = (s: string) => s.replace(/\D/g, "");

function brandOf(digits: string): string {
  if (digits.startsWith("8600")) return "UzCard";
  if (digits.startsWith("9860")) return "Humo";
  if (digits.startsWith("4")) return "Visa";
  if (digits.startsWith("5")) return "Mastercard";
  return "Карта";
}

/**
 * Balance top-up modal. The bank-card sub-flow (number → expiry → CVV → SMS code
 * → saved card) is a DEMO: nothing is stored or sent. Topping up calls a
 * TEST-ONLY RPC that credits the balance (gated to payments_mode=test on the
 * server). Real charging/card binding plugs in via the provider later.
 */
export function TopUpModal({
  open,
  onClose,
  onToppedUp,
}: {
  open: boolean;
  onClose: () => void;
  onToppedUp?: () => void;
}) {
  const t = useTranslations("Cabinet.payments");
  const [amount, setAmount] = useState<number | "">(100_000);
  const [method, setMethod] = useState<Method>("card");

  // Card sub-flow (demo, local-only)
  const [cardStep, setCardStep] = useState<"list" | "form" | "otp">("list");
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [num, setNum] = useState("");
  const [exp, setExp] = useState("");
  const [cvv, setCvv] = useState("");
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState(false);

  // Top-up action
  const [toppingUp, setToppingUp] = useState(false);
  const [topupErr, setTopupErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const numDigits = onlyDigits(num);
  const validAmount = typeof amount === "number" && amount >= 1000;
  const canTopUp = method === "card" && !!selectedCard && validAmount;

  const onNum = (v: string) => {
    const d = onlyDigits(v).slice(0, 16);
    setNum(d.replace(/(.{4})/g, "$1 ").trim());
  };
  const onExp = (v: string) => {
    const d = onlyDigits(v).slice(0, 4);
    setExp(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
  };

  const requestCode = () => {
    if (numDigits.length < 16 || onlyDigits(exp).length < 4 || cvv.length < 3) {
      setErr(true);
      return;
    }
    setErr(false);
    setCardStep("otp");
  };

  const confirmCard = () => {
    if (onlyDigits(otp).length < 6) {
      setErr(true);
      return;
    }
    const id = String(cards.length + 1) + numDigits.slice(-4);
    setCards((prev) => [{ id, brand: brandOf(numDigits), last4: numDigits.slice(-4) }, ...prev]);
    setSelectedCard(id); // auto-select the freshly added card
    setNum("");
    setExp("");
    setCvv("");
    setOtp("");
    setErr(false);
    setCardStep("list");
  };

  const topUp = async () => {
    if (!canTopUp || toppingUp) return;
    setToppingUp(true);
    setTopupErr(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("student_balance_topup", {
      p_amount: (amount as number) * 100, // UZS → tiyin
    });
    setToppingUp(false);
    if (error) {
      setTopupErr(
        error.message?.includes("TOPUP_DISABLED")
          ? t("topupTestHint")
          : t("topupFailed"),
      );
      return;
    }
    setDone(true);
    onToppedUp?.();
  };

  const reset = () => {
    setDone(false);
    setTopupErr(null);
    setCardStep("list");
    onClose();
  };

  return (
    <Modal open={open} onClose={reset} title={done ? undefined : t("topupTitle")} size="lg">
      {done ? (
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check size={28} strokeWidth={3} aria-hidden="true" />
          </span>
          <p className="mt-3 text-lg font-bold text-zinc-900">{t("topupSuccessTitle")}</p>
          <p className="mt-1 text-sm text-zinc-500">{t("topupSuccessBody")}</p>
          <Button className="mt-5 w-full" onClick={reset}>
            {t("topupDone")}
          </Button>
        </div>
      ) : (
        <>
          {/* Amount */}
          <p className="text-sm font-semibold text-zinc-700">{t("topupAmount")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(v)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                  amount === v
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-zinc-200 text-zinc-600 hover:border-brand-300",
                )}
              >
                {v.toLocaleString("ru-RU")}
              </button>
            ))}
          </div>
          <Input
            type="number"
            inputMode="numeric"
            min={1000}
            className="mt-3"
            value={amount}
            onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder={t("topupAmountPlaceholder")}
          />

          {/* Methods */}
          <p className="mt-5 text-sm font-semibold text-zinc-700">{t("topupMethod")}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["card", "payme", "click", "uzum"] as Method[]).map((m) => {
              const label = m === "card" ? t("topupCard") : m.charAt(0).toUpperCase() + m.slice(1);
              const active = method === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-sm font-bold transition",
                    active
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-zinc-200 text-zinc-600 hover:border-brand-300",
                  )}
                >
                  {m === "card" ? (
                    <CreditCard size={18} aria-hidden="true" />
                  ) : (
                    <Wallet size={18} aria-hidden="true" />
                  )}
                  <span className="text-center leading-tight">{label}</span>
                </button>
              );
            })}
          </div>

          {/* Bank-card sub-flow */}
          {method === "card" && (
            <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              {cardStep === "list" && (
                <>
                  {cards.length === 0 ? (
                    <p className="text-sm text-zinc-500">{t("topupNoCards")}</p>
                  ) : (
                    <ul className="space-y-2">
                      {cards.map((c) => {
                        const sel = selectedCard === c.id;
                        return (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedCard(c.id)}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition",
                                sel
                                  ? "border-brand-600 bg-brand-50"
                                  : "border-zinc-200 bg-white hover:border-brand-300",
                              )}
                            >
                              <CreditCard
                                size={18}
                                className={sel ? "text-brand-600" : "text-zinc-400"}
                                aria-hidden="true"
                              />
                              <span className="flex-1 text-sm font-semibold text-zinc-800">
                                {c.brand} •••• {c.last4}
                              </span>
                              {sel && <Check size={16} className="text-brand-600" aria-hidden="true" />}
                              <Trash2
                                size={16}
                                role="button"
                                aria-label={t("cardRemove")}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCards((p) => p.filter((x) => x.id !== c.id));
                                  setSelectedCard((cur) => (cur === c.id ? null : cur));
                                }}
                                className="text-zinc-400 transition-colors hover:text-red-500"
                              />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setErr(false);
                      setCardStep("form");
                    }}
                  >
                    <Plus size={15} aria-hidden="true" />
                    {t("topupAddCard")}
                  </Button>
                </>
              )}

              {cardStep === "form" && (
                <div className="space-y-3">
                  <Input
                    label={t("cardNumber")}
                    inputMode="numeric"
                    placeholder="0000 0000 0000 0000"
                    value={num}
                    onChange={(e) => onNum(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label={t("cardExpiry")}
                      inputMode="numeric"
                      placeholder="MM/YY"
                      value={exp}
                      onChange={(e) => onExp(e.target.value)}
                    />
                    <Input
                      label={t("cardCvv")}
                      inputMode="numeric"
                      type="password"
                      placeholder="•••"
                      maxLength={4}
                      value={cvv}
                      onChange={(e) => setCvv(onlyDigits(e.target.value).slice(0, 4))}
                    />
                  </div>
                  {err && <p className="text-sm text-red-600">{t("cardError")}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={requestCode}>{t("cardGetCode")}</Button>
                    <Button variant="ghost" onClick={() => setCardStep("list")}>
                      {t("cardBack")}
                    </Button>
                  </div>
                </div>
              )}

              {cardStep === "otp" && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-zinc-800">{t("cardOtpTitle")}</p>
                  <p className="text-xs text-zinc-500">{t("cardOtpHint")}</p>
                  <Input
                    inputMode="numeric"
                    placeholder="______"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(onlyDigits(e.target.value).slice(0, 6))}
                    className="tracking-[0.5em]"
                  />
                  {err && <p className="text-sm text-red-600">{t("cardError")}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={confirmCard}>{t("cardConfirm")}</Button>
                    <Button variant="ghost" onClick={() => setCardStep("form")}>
                      {t("cardBack")}
                    </Button>
                  </div>
                </div>
              )}

              <p className="mt-3 text-xs leading-relaxed text-zinc-400">{t("cardDemoNote")}</p>
            </div>
          )}

          {topupErr && (
            <p role="alert" className="mt-4 text-sm text-red-600">
              {topupErr}
            </p>
          )}

          {/* Primary action pinned full-width at the very bottom */}
          {canTopUp ? (
            <Button
              size="lg"
              loading={toppingUp}
              className="mt-6 w-full"
              onClick={topUp}
            >
              {t("topupCta")}
            </Button>
          ) : (
            <>
              <p className="mt-6 text-xs leading-relaxed text-zinc-500">
                {method === "card" ? t("topupSelectCard") : t("topupSoonNote")}
              </p>
              <div className="mt-3 flex items-center justify-center">
                {method !== "card" && <Badge variant="neutral">{t("soon")}</Badge>}
              </div>
              <Button size="lg" disabled className="mt-2 w-full">
                {t("topupCta")}
              </Button>
            </>
          )}
        </>
      )}
    </Modal>
  );
}
