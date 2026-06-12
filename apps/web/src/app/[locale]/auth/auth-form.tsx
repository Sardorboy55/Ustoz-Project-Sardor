"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Wordmark } from "@/components/brand";

const RESEND_SECONDS = 60;

/** "901234567" → "90 123 45 67" (+998 XX XXX XX XX mask). */
function maskPhone(digits: string): string {
  const parts = [
    digits.slice(0, 2),
    digits.slice(2, 5),
    digits.slice(5, 7),
    digits.slice(7, 9),
  ].filter(Boolean);
  return parts.join(" ");
}

export function AuthForm({ next }: { next: string }) {
  const t = useTranslations("Auth");
  const router = useRouter();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [digits, setDigits] = useState(""); // 9 digits after +998
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const verifyingRef = useRef(false);

  const phone = `+998${digits}`;

  // Already signed in? Straight to the destination.
  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session) router.replace(next);
    });
    return () => {
      mounted = false;
    };
  }, [next, router]);

  // resend countdown
  useEffect(() => {
    if (step !== "otp" || resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [step, resendIn]);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setBusy(false);
    if (error) {
      setError(error.status === 429 ? t("rateLimited") : t("sendFailed"));
      return;
    }
    setCode("");
    setResendIn(RESEND_SECONDS);
    setStep("otp");
  };

  const verify = async (token: string) => {
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: "sms",
      phone,
      token,
    });
    if (error) {
      verifyingRef.current = false;
      setBusy(false);
      setError(t("codeWrong"));
      return;
    }
    router.push(next); // keep the button in its loading state while navigating
  };

  const onCodeChange = (raw: string) => {
    const value = raw.replace(/\D/g, "").slice(0, 6);
    setCode(value);
    setError(null);
    if (value.length === 6) void verify(value);
  };

  return (
    <Card className="w-full max-w-md p-6 sm:p-8">
      <div className="flex justify-center">
        <Wordmark />
      </div>
      <h1 className="mt-6 text-center text-2xl font-bold tracking-tight">
        {t("title")}
      </h1>
      <p className="mt-2 text-center text-sm text-zinc-500">{t("subtitle")}</p>

      {step === "phone" ? (
        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy && digits.length === 9) void sendCode();
          }}
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-700">
              {t("phoneLabel")}
            </span>
            <div
              className={cn(
                "flex items-center rounded-xl border bg-white transition-colors",
                error
                  ? "border-red-400"
                  : "border-zinc-300 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100",
              )}
            >
              <span className="select-none pl-4 font-semibold text-zinc-500">
                +998
              </span>
              <input
                data-testid="phone-input"
                className="h-12 w-full rounded-xl bg-transparent px-2.5 font-semibold tracking-wide text-zinc-900 outline-none placeholder:font-normal placeholder:text-zinc-400"
                placeholder="90 123 45 67"
                inputMode="numeric"
                autoComplete="tel-national"
                value={maskPhone(digits)}
                onChange={(e) => {
                  setDigits(e.target.value.replace(/\D/g, "").slice(0, 9));
                  setError(null);
                }}
              />
            </div>
          </label>
          <Button
            data-testid="send-code"
            type="submit"
            size="lg"
            className="w-full"
            loading={busy}
            disabled={digits.length !== 9}
          >
            {t("sendCode")}
          </Button>
        </form>
      ) : (
        <div className="mt-8 space-y-4">
          <p className="text-center text-sm text-zinc-600">
            {t("otpSentTo", { phone: `+998 ${maskPhone(digits)}` })}
          </p>
          <label className="block">
            <span className="sr-only">{t("codeLabel")}</span>
            <input
              data-testid="otp-input"
              className={cn(
                "h-14 w-full rounded-xl border bg-white text-center text-2xl font-bold tracking-[0.45em] text-zinc-900 outline-none transition-colors",
                error
                  ? "border-red-400"
                  : "border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100",
              )}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7} // 6 digits + a pasted space survives the strip
              autoFocus
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
            />
          </label>
          <Button
            data-testid="verify"
            size="lg"
            className="w-full"
            loading={busy}
            disabled={code.length !== 6}
            onClick={() => void verify(code)}
          >
            {t("verify")}
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setCode("");
                setError(null);
              }}
              className="rounded-lg py-1 text-zinc-500 outline-none transition-colors hover:text-zinc-800 focus-visible:ring-2 focus-visible:ring-brand-600"
            >
              {t("changePhone")}
            </button>
            {resendIn > 0 ? (
              <span className="tabular-nums text-zinc-400">
                {t("resendIn", { sec: resendIn })}
              </span>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void sendCode()}
                className="rounded-lg py-1 font-semibold text-brand-700 outline-none transition-colors hover:text-brand-800 focus-visible:ring-2 focus-visible:ring-brand-600 disabled:text-zinc-400"
              >
                {t("resend")}
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <p
          data-testid="auth-error"
          role="alert"
          className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-center text-sm text-red-700"
        >
          {error}
        </p>
      )}
    </Card>
  );
}
