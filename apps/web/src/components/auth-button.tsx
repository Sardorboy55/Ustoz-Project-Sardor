"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type AuthState = "loading" | "anon" | "authed";

/**
 * Client island: "Sign in" → /auth for guests, "Cabinet" → /cabinet for
 * signed-in users. Reacts live to Supabase auth state changes.
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

  return state === "authed" ? (
    <ButtonLink
      href="/cabinet"
      size="sm"
      variant="secondary"
      className={cn(block && "w-full")}
    >
      {t("cabinet")}
    </ButtonLink>
  ) : (
    <ButtonLink href="/auth" size="sm" className={cn(block && "w-full")}>
      {t("signIn")}
    </ButtonLink>
  );
}
