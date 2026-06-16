"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  MessageCircle,
  Paperclip,
  Search,
  SendHorizontal,
  ShieldCheck,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@ustoz/shared";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { formatDayMonth, formatTime, tashkentDateKey } from "@/lib/datetime";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useCabinet } from "@/components/cabinet/cabinet-shell";

type ChatRow = {
  id: string;
  student_id: string;
  teacher_id: string;
  last_message_at: string | null;
  student: { full_name: string; avatar_url: string | null } | null;
  teacher: {
    slug: string;
    profiles: { full_name: string; avatar_url: string | null } | null;
  } | null;
  messages: Array<{ body: string | null; file_name: string | null; created_at: string }>;
};

type MessageRow = {
  id: string;
  chat_id: string;
  sender_id: string;
  body: string | null;
  body_was_masked: boolean;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
};

const CHATS_SELECT = `
  id, student_id, teacher_id, last_message_at,
  student:profiles!chats_student_id_fkey ( full_name, avatar_url ),
  teacher:teacher_profiles!chats_teacher_id_fkey ( slug,
    profiles!teacher_profiles_user_id_fkey ( full_name, avatar_url ) ),
  messages ( body, file_name, created_at )
`;

export function MessagesSkeleton() {
  return (
    <div aria-busy="true">
      <Skeleton className="h-8 w-48" />
      <Card className="mt-4 grid h-[calc(100dvh-13rem)] min-h-[420px] overflow-hidden md:h-[calc(100dvh-16rem)] md:grid-cols-[300px_1fr]">
        <div className="space-y-3 border-r border-zinc-100 p-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden md:block" />
      </Card>
    </div>
  );
}

export function MessagesClient() {
  const t = useTranslations("Cabinet.messages");
  const tCommon = useTranslations("Cabinet.common");
  const locale = useLocale() as Locale;
  const { userId } = useCabinet();
  const searchParams = useSearchParams();

  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [query, setQuery] = useState("");

  // Selected chat: explicit user pick wins over the ?chat= deep link.
  const chatParam = searchParams.get("chat");
  const [picked, setPicked] = useState<string | undefined>(undefined);
  const selectedId = picked === undefined ? chatParam : picked || null;

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("chats")
      .select(CHATS_SELECT)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { referencedTable: "messages", ascending: false })
      .limit(1, { referencedTable: "messages" });
    if (error) {
      setPhase("error");
      return;
    }
    setChats((data ?? []) as unknown as ChatRow[]);
    setPhase("ready");
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const partnerOf = useCallback(
    (c: ChatRow) =>
      userId === c.student_id
        ? {
            name: c.teacher?.profiles?.full_name ?? "",
            avatar: c.teacher?.profiles?.avatar_url ?? null,
          }
        : { name: c.student?.full_name ?? "", avatar: c.student?.avatar_url ?? null },
    [userId],
  );

  const selectedChat = useMemo(
    () => chats.find((c) => c.id === selectedId) ?? null,
    [chats, selectedId],
  );

  const visibleChats = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((c) => {
      const name = partnerOf(c).name.toLowerCase();
      const last = (c.messages?.[0]?.body ?? "").toLowerCase();
      return name.includes(q) || last.includes(q);
    });
  }, [chats, query, partnerOf]);

  /** Updates the list preview after a message arrives / is sent. */
  const bumpChatPreview = useCallback((m: MessageRow) => {
    setChats((prev) => {
      const next = prev.map((c) =>
        c.id === m.chat_id
          ? {
              ...c,
              last_message_at: m.created_at,
              messages: [
                { body: m.body, file_name: m.file_name, created_at: m.created_at },
              ],
            }
          : c,
      );
      next.sort(
        (a, b) =>
          +new Date(b.last_message_at ?? 0) - +new Date(a.last_message_at ?? 0),
      );
      return next;
    });
  }, []);

  if (phase === "loading") return <MessagesSkeleton />;

  if (phase === "error") {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          {t("title")}
        </h1>
        <ErrorState
          className="mt-4"
          description={tCommon("loadError")}
          onRetry={() => void load()}
        />
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          {t("title")}
        </h1>
        <EmptyState
          className="mt-4"
          icon={MessageCircle}
          title={t("emptyTitle")}
          description={t("emptyBody")}
          action={<ButtonLink href="/catalog">{t("goCatalog")}</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
        {t("title")}
      </h1>

      <Card className="mt-4 grid h-[calc(100dvh-13rem)] min-h-[420px] overflow-hidden md:h-[calc(100dvh-16rem)] md:grid-cols-[300px_1fr]">
        {/* Chat list */}
        <div
          className={cn(
            "flex min-h-0 flex-col border-zinc-100 md:border-r",
            selectedId ? "hidden md:flex" : "flex",
          )}
        >
          <div className="border-b border-zinc-100 p-3">
            <div className="relative">
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search")}
                aria-label={t("search")}
                className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
              />
            </div>
          </div>
          {visibleChats.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">
              {t("searchEmpty")}
            </p>
          ) : (
            <ul className="min-h-0 flex-1 overflow-y-auto">
              {visibleChats.map((c) => {
              const partner = partnerOf(c);
              const last = c.messages?.[0] ?? null;
              const lastText = last
                ? (last.body ?? `📎 ${last.file_name ?? t("attachment")}`)
                : t("noMessages");
              const when = c.last_message_at ? new Date(c.last_message_at) : null;
              const active = c.id === selectedId;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setPicked(c.id)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600",
                      active ? "bg-brand-50" : "hover:bg-zinc-50",
                    )}
                  >
                    <Avatar src={partner.avatar} name={partner.name} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-semibold text-zinc-900">
                          {partner.name}
                        </span>
                        {when && (
                          <span className="shrink-0 text-[11px] text-zinc-400">
                            {tashkentDateKey(when) === tashkentDateKey(new Date())
                              ? formatTime(when, locale)
                              : formatDayMonth(when, locale)}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-zinc-500">
                        {lastText}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            </ul>
          )}
        </div>

        {/* Thread */}
        <div
          className={cn(
            "min-h-0 flex-col md:flex",
            selectedId ? "flex" : "hidden",
          )}
        >
          {selectedChat ? (
            <ChatThread
              key={selectedChat.id}
              chat={selectedChat}
              userId={userId}
              partner={partnerOf(selectedChat)}
              locale={locale}
              onBack={() => setPicked("")}
              onMessage={bumpChatPreview}
            />
          ) : (
            <div className="hidden flex-1 flex-col items-center justify-center gap-2 p-6 text-center md:flex">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <MessageCircle size={26} aria-hidden="true" />
              </span>
              <p className="font-semibold text-zinc-900">{t("pickTitle")}</p>
              <p className="text-sm text-zinc-500">{t("pickBody")}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function ChatThread({
  chat,
  userId,
  partner,
  locale,
  onBack,
  onMessage,
}: {
  chat: ChatRow;
  userId: string;
  partner: { name: string; avatar: string | null };
  locale: Locale;
  onBack: () => void;
  onMessage: (m: MessageRow) => void;
}) {
  const t = useTranslations("Cabinet.messages");
  const tCommon = useTranslations("Cabinet.common");

  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    rows: MessageRow[];
    failed: boolean;
  } | null>(null);
  const fetchKey = `${chat.id}|${reload}`;

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Realtime inserts that arrive while the initial fetch is still pending — they
  // would otherwise be dropped (result is null), so buffer and flush on resolve.
  const pendingRef = useRef<MessageRow[]>([]);

  useEffect(() => {
    let mounted = true;
    // New fetch window: discard any buffer from the previous chat/reload.
    pendingRef.current = [];
    const supabase = createClient();
    supabase
      .from("messages")
      .select("id, chat_id, sender_id, body, body_was_masked, file_url, file_name, created_at")
      .eq("chat_id", chat.id)
      .order("created_at", { ascending: true })
      .limit(500)
      .then(({ data, error }) => {
        if (!mounted) return;
        const fetched = (data ?? []) as MessageRow[];
        // Merge in messages that arrived during the fetch, dedup by id, re-sort.
        const buffered = pendingRef.current;
        pendingRef.current = [];
        const byId = new Map(fetched.map((r) => [r.id, r]));
        for (const m of buffered) if (!byId.has(m.id)) byId.set(m.id, m);
        const rows = Array.from(byId.values()).sort((a, b) =>
          a.created_at.localeCompare(b.created_at),
        );
        setResult({ key: fetchKey, rows, failed: Boolean(error) });
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey]);

  const loading = result?.key !== fetchKey;
  const failed = !loading && Boolean(result?.failed);
  const rows = useMemo(
    () => (!loading && !failed ? (result?.rows ?? []) : []),
    [loading, failed, result],
  );

  const append = useCallback(
    (m: MessageRow) => {
      setResult((prev) => {
        // Initial fetch not resolved yet — buffer instead of dropping.
        if (!prev) {
          if (!pendingRef.current.some((r) => r.id === m.id)) {
            pendingRef.current.push(m);
          }
          return prev;
        }
        if (prev.rows.some((r) => r.id === m.id)) return prev;
        return { ...prev, rows: [...prev.rows, m] };
      });
      onMessage(m);
    },
    [onMessage],
  );

  // Realtime: new messages in this chat (sent from the other side or mobile).
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages-${chat.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chat.id}`,
        },
        (payload) => append(payload.new as MessageRow),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [chat.id, append]);

  // Keep the latest message in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [rows.length, loading]);

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setSendFailed(false);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("messages")
      .insert({ chat_id: chat.id, sender_id: userId, body })
      .select("id, chat_id, sender_id, body, body_was_masked, file_url, file_name, created_at")
      .single();
    setSending(false);
    if (error || !data) {
      setSendFailed(true);
      return;
    }
    setText("");
    append(data as MessageRow);
  };

  return (
    <>
      {/* Thread header */}
      <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label={t("back")}
          className="-ml-1 flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 md:hidden"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <Avatar src={partner.avatar} name={partner.name} size="sm" />
        <span className="truncate font-semibold text-zinc-900">{partner.name}</span>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-50/50 px-4 py-4">
        {loading ? (
          <div aria-busy="true" className="space-y-3">
            <Skeleton className="h-10 w-2/3 rounded-2xl" />
            <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
            <Skeleton className="h-10 w-1/2 rounded-2xl" />
          </div>
        ) : failed ? (
          <ErrorState
            description={tCommon("loadError")}
            onRetry={() => setReload((x) => x + 1)}
            className="border-0 bg-transparent py-8"
          />
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">{t("noMessages")}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((m, i) => {
              const own = m.sender_id === userId;
              const created = new Date(m.created_at);
              const prev = rows[i - 1];
              const newDay =
                !prev ||
                tashkentDateKey(new Date(prev.created_at)) !==
                  tashkentDateKey(created);
              return (
                <li key={m.id}>
                  {newDay && (
                    <p className="my-3 text-center text-xs font-medium text-zinc-400">
                      {formatDayMonth(created, locale)}
                    </p>
                  )}
                  <div className={cn("flex", own ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                        own
                          ? "rounded-br-md bg-brand-600 text-white"
                          : "rounded-bl-md border border-zinc-200 bg-white text-zinc-900",
                      )}
                    >
                      {m.body && (
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      )}
                      {m.file_url && (
                        <a
                          href={m.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            "mt-1 inline-flex items-center gap-1.5 text-xs font-semibold underline",
                            own ? "text-white" : "text-brand-700",
                          )}
                        >
                          <Paperclip size={13} aria-hidden="true" />
                          {m.file_name ?? t("attachment")}
                        </a>
                      )}
                      <span
                        className={cn(
                          "mt-1 flex items-center justify-end gap-1.5 text-[10px]",
                          own ? "text-white/70" : "text-zinc-400",
                        )}
                      >
                        {m.body_was_masked && (
                          <span className="inline-flex items-center gap-0.5">
                            <ShieldCheck size={11} aria-hidden="true" />
                            {t("masked")}
                          </span>
                        )}
                        {formatTime(created, locale)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={send} className="border-t border-zinc-100 px-4 py-3">
        {sendFailed && (
          <p role="alert" className="mb-2 text-xs text-red-600">
            {t("sendError")}
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={text}
            disabled={sending}
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            className="max-h-32 min-h-11 w-full flex-1 resize-none rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 disabled:bg-zinc-50"
          />
          <Button
            type="submit"
            disabled={!text.trim()}
            loading={sending}
            aria-label={t("send")}
            className="h-11 w-11 shrink-0 px-0"
          >
            {!sending && <SendHorizontal size={18} aria-hidden="true" />}
          </Button>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-400">
          <ShieldCheck size={13} className="shrink-0" aria-hidden="true" />
          {t("maskNote")}
        </p>
      </form>
    </>
  );
}
