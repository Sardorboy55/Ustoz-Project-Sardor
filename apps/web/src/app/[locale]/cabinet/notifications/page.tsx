"use client";

import { useCallback, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Bell, CalendarX2, CheckCheck, Clock, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@ustoz/shared";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { formatDayMonth, formatTime } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useCabinet } from "@/components/cabinet/cabinet-shell";

type NotificationRow = {
  id: string;
  template: string;
  payload: { booking_id?: string } | null;
  scheduled_at: string;
  read_at: string | null;
};

type TemplateMeta = {
  icon: LucideIcon;
  iconClass: string;
  titleKey: string;
  bodyKey: string;
};

const TEMPLATES: Record<string, TemplateMeta> = {
  booking_reminder_24h: {
    icon: Clock,
    iconClass: "bg-brand-50 text-brand-600",
    titleKey: "reminder24Title",
    bodyKey: "reminder24Body",
  },
  booking_reminder_1h: {
    icon: Clock,
    iconClass: "bg-amber-50 text-amber-600",
    titleKey: "reminder1Title",
    bodyKey: "reminder1Body",
  },
  booking_cancelled: {
    icon: CalendarX2,
    iconClass: "bg-red-50 text-red-500",
    titleKey: "cancelledTitle",
    bodyKey: "cancelledBody",
  },
  review_request: {
    icon: Star,
    iconClass: "bg-accent-50 text-accent-600",
    titleKey: "reviewTitle",
    bodyKey: "reviewBody",
  },
};

export default function NotificationsPage() {
  const t = useTranslations("Cabinet.notifications");
  const tCommon = useTranslations("Cabinet.common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { userId, setUnreadCount } = useCabinet();

  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("id, template, payload, scheduled_at, read_at")
      .eq("user_id", userId)
      .order("scheduled_at", { ascending: false })
      .limit(100);
    if (error) {
      setPhase("error");
      return;
    }
    setRows((data ?? []) as NotificationRow[]);
    setPhase("ready");
  }, [userId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const markRead = async (row: NotificationRow) => {
    if (!row.read_at) {
      const readAt = new Date().toISOString();
      // Optimistic: functional updates so concurrent taps each decrement once
      // (a stale closed-over count would collapse multiple reads into one).
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, read_at: readAt } : r)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      const supabase = createClient();
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: readAt })
        .eq("id", row.id);
      if (error) {
        // Roll the optimistic update back so the badge and row stay truthful.
        setRows((prev) =>
          prev.map((r) => (r.id === row.id ? { ...r, read_at: null } : r)),
        );
        setUnreadCount((c) => c + 1);
      }
    }
    const bookingId = row.payload?.booking_id;
    if (bookingId) router.push(`/booking/${bookingId}`);
  };

  const markAll = async () => {
    setMarkingAll(true);
    const readAt = new Date().toISOString();
    const supabase = createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: readAt })
      .eq("user_id", userId)
      .is("read_at", null);
    setMarkingAll(false);
    if (!error) {
      setRows((prev) => prev.map((r) => ({ ...r, read_at: r.read_at ?? readAt })));
      setUnreadCount(0);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          {t("title")}
        </h1>
        {phase === "ready" && rows.some((r) => !r.read_at) && (
          <Button variant="ghost" size="sm" loading={markingAll} onClick={markAll}>
            {!markingAll && <CheckCheck size={15} aria-hidden="true" />}
            {t("markAll")}
          </Button>
        )}
      </div>

      <div className="mt-4">
        {phase === "loading" && (
          <div aria-busy="true" className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        )}

        {phase === "error" && (
          <ErrorState description={tCommon("loadError")} onRetry={() => void load()} />
        )}

        {phase === "ready" && rows.length === 0 && (
          <EmptyState icon={Bell} title={t("emptyTitle")} description={t("emptyBody")} />
        )}

        {phase === "ready" && rows.length > 0 && (
          <ul className="space-y-2">
            {rows.map((row) => {
              const meta = TEMPLATES[row.template] ?? null;
              const Icon = meta?.icon ?? Bell;
              const when = new Date(row.scheduled_at);
              const unread = !row.read_at;
              const clickable = Boolean(row.payload?.booking_id) || unread;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() => void markRead(row)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl border p-4 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-brand-600",
                      unread
                        ? "border-brand-200 bg-brand-50/60"
                        : "border-zinc-200 bg-white",
                      clickable && "hover:border-brand-300 hover:shadow-sm",
                      !clickable && "cursor-default",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                        meta?.iconClass ?? "bg-zinc-100 text-zinc-500",
                      )}
                    >
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "truncate text-sm",
                            unread
                              ? "font-bold text-zinc-900"
                              : "font-semibold text-zinc-700",
                          )}
                        >
                          {meta ? t(meta.titleKey) : t("genericTitle")}
                        </span>
                        {unread && (
                          <span
                            aria-hidden="true"
                            className="h-2 w-2 shrink-0 rounded-full bg-brand-600"
                          />
                        )}
                      </span>
                      <span className="mt-0.5 block text-sm text-zinc-500">
                        {meta ? t(meta.bodyKey) : row.template}
                      </span>
                      <span className="mt-1 block text-xs text-zinc-400">
                        {formatDayMonth(when, locale)}, {formatTime(when, locale)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
