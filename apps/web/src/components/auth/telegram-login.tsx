"use client";

import { useEffect, useRef } from "react";

// Username бота (без секрета). Можно переопределить через env.
const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT ?? "ibilim_login_bot";

export type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

/**
 * Официальный Telegram Login Widget. Telegram рисует свою кнопку (iframe); по
 * успешному входу вызывает глобальный onTelegramAuth(user). Скрипт встраиваем
 * один раз, актуальный обработчик держим в ref, чтобы не перерисовывать кнопку.
 */
export function TelegramLoginButton({
  onAuth,
}: {
  onAuth: (user: TelegramUser) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onAuth);
  useEffect(() => {
    cb.current = onAuth;
  }, [onAuth]);

  useEffect(() => {
    (
      window as unknown as { onTelegramAuth?: (u: TelegramUser) => void }
    ).onTelegramAuth = (u) => cb.current(u);

    const host = ref.current;
    if (!host) return;
    host.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", BOT);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    host.appendChild(script);

    return () => {
      host.innerHTML = "";
    };
  }, []);

  return <div ref={ref} className="flex min-h-[48px] justify-center" />;
}
