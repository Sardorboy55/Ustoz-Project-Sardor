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

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.5 5.5 0 0 1-2.4 3.6v3h3.86c2.26-2.09 3.56-5.17 3.56-8.84z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.86-3c-1.08.72-2.45 1.16-4.09 1.16-3.14 0-5.8-2.12-6.76-4.98H1.26v3.09A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.24 14.27a7.2 7.2 0 0 1 0-4.54V6.64H1.26a12 12 0 0 0 0 10.72l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.96 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.64l3.98 3.09C6.2 6.89 8.86 4.77 12 4.77z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
  );
}

const inputClass =
  "h-12 w-full rounded-xl border border-zinc-300 bg-white px-3.5 text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

/** Seeded demo numbers (+998 90 000 00 XX) have a fixed OTP 123456, no real SMS. */
const isTestPhone = (digits: string) =>
  digits.length === 9 && digits.startsWith("9000000");

export function AuthForm({ next }: { next: string }) {
  const t = useTranslations("Auth");
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [method, setMethod] = useState<"phone" | "email">("phone");

  // phone
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [digits, setDigits] = useState("");
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const verifyingRef = useRef(false);

  // email + shared
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const phone = `+998${digits}`;
  const reset = () => {
    setError(null);
    setNotice(null);
  };

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

  // ---------- Social ----------
  // Google OAuth: redirect to Google, then back to /auth/callback which exchanges
  // the code for a session and continues to `next`. Requires the Google provider
  // enabled in Supabase (dashboard) + redirect URL whitelisted.
  const loginGoogle = async () => {
    setBusy(true);
    reset();
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    // On success the browser navigates away to Google; only errors return here.
    if (error) {
      setBusy(false);
      setError(t("googleFailed"));
    }
  };
  // Telegram needs a custom edge function (verify the login widget hash + mint a
  // session) — not a native Supabase provider. Still "coming soon".
  const loginTelegram = () => setNotice(t("tgSoon"));

  // ---------- Phone OTP ----------
  const sendCode = async () => {
    setBusy(true);
    reset();
    const { error } = await createClient().auth.signInWithOtp({
      phone,
      options:
        mode === "register" && name.trim()
          ? { data: { full_name: name.trim() } }
          : undefined,
    });
    setBusy(false);
    const test = isTestPhone(digits);
    // Test numbers use a fixed OTP (no SMS), so proceed to code entry even if
    // the provider errors. Real numbers still surface the error.
    if (error && !test) {
      setError(error.status === 429 ? t("rateLimited") : t("sendFailed"));
      return;
    }
    if (test) setNotice("Тестовый номер — введите код 123456.");
    setCode("");
    setResendIn(RESEND_SECONDS);
    setStep("otp");
  };

  const verify = async (token: string) => {
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    setBusy(true);
    reset();
    const { error } = await createClient().auth.verifyOtp({
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
    router.push(next);
  };

  const onCodeChange = (raw: string) => {
    const value = raw.replace(/\D/g, "").slice(0, 6);
    setCode(value);
    setError(null);
    if (value.length === 6) void verify(value);
  };

  // ---------- Email + password ----------
  const submitEmail = async () => {
    setBusy(true);
    reset();
    const supabase = createClient();
    if (mode === "register") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: name.trim() ? { full_name: name.trim() } : undefined },
      });
      setBusy(false);
      if (error) {
        setError(t("emailFailed"));
        return;
      }
      if (data.session) router.push(next);
      else setNotice(t("checkEmail"));
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setBusy(false);
      if (error) {
        setError(t("emailFailed"));
        return;
      }
      router.push(next);
    }
  };

  const isRegister = mode === "register";

  return (
    <Card className="w-full max-w-md p-6 sm:p-8">
      <div className="flex justify-center">
        <Wordmark />
      </div>
      <h1 className="mt-6 text-center text-2xl font-bold tracking-tight">
        {t("welcomeTitle")}
      </h1>
      <p className="mt-2 text-center text-sm text-zinc-500">
        {isRegister ? t("welcomeSubtitleReg") : t("welcomeSubtitle")}
      </p>

      {/* Social */}
      <div className="mt-6 space-y-2.5">
        <button
          type="button"
          onClick={() => void loginGoogle()}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-zinc-300 bg-white font-semibold text-zinc-700 shadow-sm outline-none transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:opacity-60"
        >
          <GoogleIcon className="h-5 w-5" />
          {t("continueGoogle")}
        </button>
        <button
          type="button"
          onClick={loginTelegram}
          className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-[#229ED9] font-semibold text-white shadow-sm outline-none transition hover:bg-[#1d8ec4] focus-visible:ring-2 focus-visible:ring-[#229ED9] focus-visible:ring-offset-2"
        >
          <TelegramIcon className="h-5 w-5" />
          {t("continueTelegram")}
        </button>
      </div>

      <div className="my-5 flex items-center gap-3 text-xs text-zinc-400">
        <span className="h-px flex-1 bg-zinc-200" />
        {t("or")}
        <span className="h-px flex-1 bg-zinc-200" />
      </div>

      {/* Method tabs */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 text-sm font-semibold">
        {(["phone", "email"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMethod(m);
              reset();
            }}
            className={cn(
              "rounded-lg py-2 transition",
              method === m
                ? "bg-white text-brand-700 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700",
            )}
          >
            {m === "phone" ? t("tabPhone") : t("tabEmail")}
          </button>
        ))}
      </div>

      {/* Form */}
      {method === "phone" ? (
        step === "phone" ? (
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy && digits.length === 9) void sendCode();
            }}
          >
            {isRegister && (
              <input
                className={inputClass}
                placeholder={t("nameLabel")}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
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

            {process.env.NODE_ENV !== "production" && (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-3 text-xs text-zinc-500">
                <p className="font-medium text-zinc-600">Тест-вход (код 123456):</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDigits("900000099");
                      setError(null);
                    }}
                    className="rounded-md border border-zinc-200 bg-white px-2 py-1 font-medium text-zinc-700 transition hover:border-brand-300 hover:text-brand-700"
                  >
                    Админ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDigits("900000010");
                      setError(null);
                    }}
                    className="rounded-md border border-zinc-200 bg-white px-2 py-1 font-medium text-zinc-700 transition hover:border-brand-300 hover:text-brand-700"
                  >
                    Ученик
                  </button>
                </div>
              </div>
            )}
          </form>
        ) : (
          <div className="mt-4 space-y-4">
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
                maxLength={7}
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
                  reset();
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
        )
      ) : (
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy && email && password.length >= 6) void submitEmail();
          }}
        >
          {isRegister && (
            <input
              className={inputClass}
              placeholder={t("nameLabel")}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            className={inputClass}
            type="email"
            placeholder={t("emailLabel")}
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
          />
          <input
            className={inputClass}
            type="password"
            placeholder={t("passwordLabel")}
            autoComplete={isRegister ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
          />
          <Button
            type="submit"
            size="lg"
            className="w-full"
            loading={busy}
            disabled={!email || password.length < 6}
          >
            {isRegister ? t("btnRegister") : t("btnLogin")}
          </Button>
        </form>
      )}

      {/* Mode toggle */}
      <p className="mt-5 text-center text-sm text-zinc-500">
        {isRegister ? t("haveAccountQ") : t("noAccountQ")}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(isRegister ? "login" : "register");
            setStep("phone");
            reset();
          }}
          className="font-semibold text-brand-700 outline-none transition-colors hover:text-brand-800 focus-visible:underline"
        >
          {isRegister ? t("btnLogin") : t("btnRegister")}
        </button>
      </p>

      {error && (
        <p
          data-testid="auth-error"
          role="alert"
          className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-center text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {notice && (
        <p className="mt-4 rounded-xl bg-brand-50 px-4 py-2.5 text-center text-sm text-brand-800">
          {notice}
        </p>
      )}
    </Card>
  );
}
