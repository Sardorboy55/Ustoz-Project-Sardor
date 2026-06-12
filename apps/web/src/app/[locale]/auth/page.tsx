"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

const normalizePhone = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 9) return `+998${digits}`;
  if (digits.startsWith("998") && digits.length === 12) return `+${digits}`;
  return `+${digits}`;
};

export default function AuthPage() {
  const t = useTranslations("Auth");
  const router = useRouter();
  useLocale(); // keep locale context warm for redirects

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalizePhone(phone),
    });
    setBusy(false);
    if (error) {
      setError(error.status === 429 ? t("rateLimited") : t("sendFailed"));
      return;
    }
    setStep("otp");
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      type: "sms",
      phone: normalizePhone(phone),
      token: code,
    });
    setBusy(false);
    if (error) {
      setError(t("codeWrong"));
      return;
    }
    router.push("/cabinet");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-sm text-zinc-600">{t("subtitle")}</p>

      {step === "phone" ? (
        <div className="mt-8 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">{t("phoneLabel")}</span>
            <div className="mt-1 flex items-center rounded-xl border border-zinc-300 focus-within:border-teal-600">
              <span className="pl-3 text-zinc-500">+998</span>
              <input
                data-testid="phone-input"
                className="w-full rounded-xl px-2 py-3 outline-none"
                placeholder="90 123 45 67"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
              />
            </div>
          </label>
          <button
            data-testid="send-code"
            onClick={sendCode}
            disabled={busy || phone.replace(/\D/g, "").length !== 9}
            className="w-full rounded-xl bg-teal-700 py-3 font-semibold text-white disabled:opacity-40"
          >
            {busy ? "..." : t("sendCode")}
          </button>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-zinc-600">
            {t("otpSentTo", { phone: normalizePhone(phone) })}
          </p>
          <input
            data-testid="otp-input"
            className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-teal-600"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          <button
            data-testid="verify"
            onClick={verify}
            disabled={busy || code.length !== 6}
            className="w-full rounded-xl bg-teal-700 py-3 font-semibold text-white disabled:opacity-40"
          >
            {busy ? "..." : t("verify")}
          </button>
          <button
            onClick={() => setStep("phone")}
            className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-700"
          >
            {t("changePhone")}
          </button>
        </div>
      )}

      {error && (
        <p data-testid="auth-error" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}
    </main>
  );
}
