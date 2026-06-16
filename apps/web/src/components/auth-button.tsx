"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type AuthState = "loading" | "anon" | "authed";

/**
 * Corner auth control. Guests see "Вход" → /auth. "Кабинет" lives in the nav,
 * so on desktop signed-in users get nothing here; the mobile menu keeps a
 * full-width cabinet button. Reacts live to Supabase auth changes.
 */
export function AuthButton({ block = false }: { block?: boolean }) {
  const t = useTranslations("Header");
  const [state, setState] = useState<AuthState>("loading");

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setState(data.session ? "authed" : "anon");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(session ? "authed" : "anon");
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (state === "loading") {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-9 animate-pulse rounded-xl bg-zinc-100",
          block ? "w-full" : "w-24",
        )}
      />
    );
  }

  if (state === "authed") {
    // Desktop: cabinet lives in the nav, so the corner stays empty.
    return block ? (
      <ButtonLink href="/cabinet" size="sm" variant="secondary" className="w-full">
        {t("cabinet")}
      </ButtonLink>
    ) : null;
  }

  return (
    <ButtonLink href="/auth" size="sm" className={cn("min-w-28", block && "w-full")}>
      {t("signIn")}
    </ButtonLink>
  );
}
