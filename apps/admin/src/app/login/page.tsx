"use client";

// Вход в админку: телефон + OTP (как apps/web auth, упрощённо).
// После verify проверяем profiles.is_admin: не админ → signOut + ошибка.

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button, Input } from "@/components/ui";
import { LogoMark } from "@/components/logo";

const normalizePhone = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 9) return `+998${digits}`;
  if (digits.startsWith("998") && digits.length === 12) return `+${digits}`;
  return `+${digits}`;
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("reason") === "forbidden"
      ? "Доступ только для администраторов."
      : null,
  );

  const supabase = createClient();

  // Уже залогинен как админ → сразу в панель.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session || cancelled) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", session.user.id)
        .maybeSingle();
      if (!cancelled && profile?.is_admin) router.replace("/");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalizePhone(phone),
    });
    setBusy(false);
    if (error) {
      setError(
        error.status === 429
          ? "Слишком много попыток. Подождите минуту и попробуйте снова."
          : "Не удалось отправить код. Проверьте номер и попробуйте ещё раз.",
      );
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
    if (error) {
      setBusy(false);
      setError("Неверный код. Попробуйте ещё раз.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = user
      ? await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .maybeSingle()
      : { data: null };

    if (!profile?.is_admin) {
      await supabase.auth.signOut();
      setBusy(false);
      setError("Доступ только для администраторов.");
      setStep("phone");
      setCode("");
      return;
    }

    router.replace("/");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="rounded-2xl bg-brand-tint p-3.5 text-brand">
            <LogoMark className="h-6 w-auto" />
          </div>
          <h1 className="text-xl font-extrabold tracking-wide text-zinc-900">
            IBILIM <span className="font-semibold text-brand">Admin</span>
          </h1>
          <p className="text-sm text-zinc-500">Панель управления платформой</p>
        </div>

        {step === "phone" ? (
          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              sendCode();
            }}
          >
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700">
                Номер телефона
              </span>
              <div className="flex items-center rounded-xl border border-zinc-300 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                <span className="pl-3 text-sm text-zinc-500">+998</span>
                <input
                  className="w-full rounded-xl bg-transparent px-2 py-2.5 text-sm outline-none"
                  placeholder="90 000 00 99"
                  inputMode="numeric"
                  autoFocus
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))
                  }
                />
              </div>
            </label>
            <Button
              type="submit"
              loading={busy}
              disabled={phone.length !== 9}
              className="w-full"
            >
              Получить код
            </Button>
          </form>
        ) : (
          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              verify();
            }}
          >
            <p className="text-sm text-zinc-600">
              Код отправлен на {normalizePhone(phone)}
            </p>
            <Input
              className="text-center text-2xl tracking-[0.5em]"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <Button
              type="submit"
              loading={busy}
              disabled={code.length !== 6}
              className="w-full"
            >
              Войти
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setStep("phone");
                setCode("");
                setError(null);
              }}
            >
              Изменить номер
            </Button>
          </form>
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
