"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, GraduationCap, Wallet } from "lucide-react";
import { useLocale } from "next-intl";
import { type Locale } from "@ustoz/shared";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

type Notif = {
  id: string;
  template: string;
  payload: Record<string, unknown>;
  scheduled_at: string;
  read_at: string | null;
};

const fmtSum = (tiyin: number) =>
  `${Math.round(tiyin / 100).toLocaleString("ru-RU")} сум`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

/** Renders the user-facing title/body/icon for an in-app notification. */
function render(n: Notif, locale: Locale) {
  const p = n.payload ?? {};
  const subUz = (p.subject_uz as string) || "";
  const subRu = (p.subject_ru as string) || "";
  const subject = locale === "ru" ? subRu || subUz : subUz || subRu;
  const sub = subject ? ` по предмету «${subject}»` : "";

  if (n.template === "purchase_student") {
    return {
      icon: GraduationCap,
      title: "Урок оплачен",
      body: `Вы записались к ${(p.teacher_name as string) || "преподавателю"}${sub}. Желаем удачи и приятных уроков!`,
    };
  }
  if (n.template === "purchase_teacher") {
    const amount = Number(p.amount) || 0;
    return {
      icon: Wallet,
      title: "Новая запись на урок",
      body: `У вас купили урок${sub}.${amount ? ` Сумма: ${fmtSum(amount)}.` : ""}`,
    };
  }
  return { icon: Bell, title: "Уведомление", body: n.template };
}

/**
 * Header notifications bell. Shows the signed-in user's in-app notifications
 * (purchase events) with an unread badge, marks them read when opened, and
 * listens to Supabase realtime for new ones. Renders nothing for guests.
 */
export function NotificationsBell() {
  const locale = useLocale() as Locale;
  const [uid, setUid] = useState<string | null>(null);
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const unread = items.filter((n) => !n.read_at).length;

  // Resolve session + load notifications + subscribe to realtime inserts.
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    queueMicrotask(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUid(user.id);

      const { data } = await supabase
        .from("notifications")
        .select("id, template, payload, scheduled_at, read_at")
        .eq("channel", "in_app")
        .order("scheduled_at", { ascending: false })
        .limit(20);
      setItems((data ?? []) as Notif[]);

      channel = supabase
        .channel("notif-bell")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const n = payload.new as Notif & { channel?: string };
            if (n.channel && n.channel !== "in_app") return;
            setItems((prev) => [n, ...prev].slice(0, 20));
          },
        )
        .subscribe();
    });

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Mark everything read when the panel opens.
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0 && uid) {
      const ids = items.filter((n) => !n.read_at).map((n) => n.id);
      setItems((prev) =>
        prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })),
      );
      const supabase = createClient();
      queueMicrotask(async () => {
        await supabase
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .in("id", ids);
      });
    }
  };

  if (!uid) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Уведомления"
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-zinc-600 transition hover:bg-zinc-100 hover:text-brand-700"
      >
        <Bell size={20} aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
          <div className="border-b border-zinc-100 px-4 py-3">
            <p className="text-sm font-bold text-zinc-900">Уведомления</p>
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell size={28} className="mx-auto text-zinc-300" aria-hidden="true" />
              <p className="mt-2 text-sm text-zinc-500">Пока нет уведомлений</p>
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-zinc-100 overflow-y-auto">
              {items.map((n) => {
                const { icon: Icon, title, body } = render(n, locale);
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "flex gap-3 px-4 py-3",
                      !n.read_at && "bg-brand-50/40",
                    )}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Icon size={16} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-zinc-900">{title}</p>
                      <p className="mt-0.5 text-sm leading-snug text-zinc-600">{body}</p>
                      <p className="mt-1 text-xs text-zinc-400">{fmtDate(n.scheduled_at)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
