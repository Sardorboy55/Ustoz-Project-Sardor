"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Wordmark } from "@/components/brand";
import {
  TelegramLoginButton,
  type TelegramUser,
} from "@/components/auth/telegram-login";

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

/** Sign-in: social providers only (Google + Telegram). */
export function AuthForm({ next }: { next: string }) {
  const t = useTranslations("Auth");
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const loginGoogle = async () => {
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setBusy(false);
      setError(t("googleFailed"));
    }
  };

  const telegramAuth = async (user: TelegramUser) => {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke("telegram-auth", {
      body: user,
    });
    if (error || !data?.otp || !data?.email) {
      setBusy(false);
      setError(t("tgFailed"));
      return;
    }
    let vErr = (
      await supabase.auth.verifyOtp({
        email: data.email,
        token: data.otp,
        type: "email",
      })
    ).error;
    if (vErr) {
      vErr = (
        await supabase.auth.verifyOtp({
          email: data.email,
          token: data.otp,
          type: "magiclink",
        })
      ).error;
    }
    if (vErr) {
      setBusy(false);
      setError(t("tgFailed"));
      return;
    }
    router.push(next);
  };

  return (
    <Card className="w-full max-w-md p-6 sm:p-8">
      <div className="flex justify-center">
        <Wordmark />
      </div>
      <h1 className="mt-6 text-center text-2xl font-bold tracking-tight">
        {t("welcomeTitle")}
      </h1>
      <p className="mt-2 text-center text-sm text-zinc-500">
        {t("welcomeSubtitle")}
      </p>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={() => void loginGoogle()}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-zinc-300 bg-white font-semibold text-zinc-700 shadow-sm outline-none transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:opacity-60"
        >
          <GoogleIcon className="h-5 w-5" />
          {t("continueGoogle")}
        </button>

        <TelegramLoginButton onAuth={telegramAuth} />
      </div>

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
