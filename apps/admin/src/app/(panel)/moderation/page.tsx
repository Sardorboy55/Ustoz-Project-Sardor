"use client";

// Модерация: очередь срабатываний контакт-фильтра (сообщения и профили).
// Одобрить / Скрыть / Бан — update moderation_queue (+ admin_set_user_banned).

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Ban, Check, EyeOff, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { logAdminAction } from "@/lib/audit";
import { formatDateTime } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  Pagination,
  Skeleton,
  Table,
  Textarea,
  useToast,
} from "@/components/ui";

const PAGE_SIZE = 20;

type QueueItem = {
  id: string;
  entity_type: "message" | "teacher_profile";
  entity_id: string;
  reason: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  // обогащение
  content: string; // текст сообщения или headline профиля
  authorId: string | null; // кого банить
  authorName: string;
};

const STATUS_BADGES: Record<string, { label: string; tone: "amber" | "emerald" | "zinc" | "red" }> = {
  pending: { label: "Ожидает", tone: "amber" },
  approved: { label: "Одобрено", tone: "emerald" },
  hidden: { label: "Скрыто", tone: "zinc" },
  banned: { label: "Бан", tone: "red" },
};

async function enrich(
  raw: Array<Omit<QueueItem, "content" | "authorId" | "authorName">>,
): Promise<QueueItem[]> {
  const supabase = createClient();

  const messageIds = raw.filter((r) => r.entity_type === "message").map((r) => r.entity_id);
  const teacherIds = raw
    .filter((r) => r.entity_type === "teacher_profile")
    .map((r) => r.entity_id);

  const messages = new Map<string, { body: string | null; sender_id: string }>();
  if (messageIds.length > 0) {
    const { data, error } = await supabase
      .from("messages")
      .select("id, body, sender_id")
      .in("id", messageIds);
    if (error) throw error;
    for (const m of data ?? []) messages.set(m.id, m);
  }

  const headlines = new Map<string, string>();
  if (teacherIds.length > 0) {
    const { data, error } = await supabase
      .from("teacher_profiles")
      .select("user_id, headline_ru, headline_uz")
      .in("user_id", teacherIds);
    if (error) throw error;
    for (const t of data ?? [])
      headlines.set(t.user_id, t.headline_ru || t.headline_uz || "");
  }

  const profileIds = Array.from(
    new Set([...teacherIds, ...Array.from(messages.values()).map((m) => m.sender_id)]),
  );
  const names = new Map<string, string>();
  if (profileIds.length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", profileIds);
    if (error) throw error;
    for (const p of data ?? []) names.set(p.id, p.full_name);
  }

  return raw.map((r) => {
    if (r.entity_type === "message") {
      const m = messages.get(r.entity_id);
      return {
        ...r,
        content: m?.body || "(сообщение недоступно)",
        authorId: m?.sender_id ?? null,
        authorName: m ? names.get(m.sender_id) || "—" : "—",
      };
    }
    return {
      ...r,
      content: headlines.get(r.entity_id) || "(профиль преподавателя)",
      authorId: r.entity_id,
      authorName: names.get(r.entity_id) || "—",
    };
  });
}

const QUEUE_FIELDS = "id, entity_type, entity_id, reason, status, created_at, resolved_at";

async function fetchPending(): Promise<QueueItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("moderation_queue")
    .select(QUEUE_FIELDS)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) throw error;
  return enrich((data ?? []) as QueueItem[]);
}

async function fetchResolved(page: number): Promise<{ rows: QueueItem[]; total: number }> {
  const supabase = createClient();
  const { data, error, count } = await supabase
    .from("moderation_queue")
    .select(QUEUE_FIELDS, { count: "exact" })
    .neq("status", "pending")
    .order("resolved_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (error) throw error;
  return { rows: await enrich((data ?? []) as QueueItem[]), total: count ?? 0 };
}

type Decision = "approved" | "hidden" | "banned";

const DECISION_LABELS: Record<Decision, string> = {
  approved: "Одобрить",
  hidden: "Скрыть",
  banned: "Забанить автора",
};

export default function ModerationPage() {
  const toast = useToast();

  const [pending, setPending] = useState<QueueItem[] | null>(null);
  const [resolved, setResolved] = useState<QueueItem[] | null>(null);
  const [resolvedTotal, setResolvedTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState(false);

  const [confirm, setConfirm] = useState<{ item: QueueItem; decision: Decision } | null>(
    null,
  );
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  // loading = pending/resolved === null; сбрасываем в обработчиках, не в эффекте
  const retry = useCallback(() => {
    setError(false);
    setPending(null);
    setResolved(null);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchPending(), fetchResolved(page)])
      .then(([pendingRows, resolvedData]) => {
        if (cancelled) return;
        setPending(pendingRows);
        setResolved(resolvedData.rows);
        setResolvedTotal(resolvedData.total);
        setError(false);
      })
      .catch((e) => {
        console.error("moderation load failed:", e);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [page, attempt]);

  const closeConfirm = () => {
    setConfirm(null);
    setComment("");
  };

  const resolve = async () => {
    if (!confirm) return;
    const { item, decision } = confirm;
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (decision === "banned") {
      if (!item.authorId) {
        setBusy(false);
        toast("Автор недоступен — забанить не получится.", "error");
        return;
      }
      const { error: banErr } = await supabase.rpc("admin_set_user_banned", {
        p_user_id: item.authorId,
        p_banned: true,
        p_comment: comment.trim() || `модерация: ${item.reason ?? item.entity_type}`,
      });
      if (banErr) {
        setBusy(false);
        console.error("ban failed:", banErr);
        toast("Не удалось забанить пользователя. Попробуйте ещё раз.", "error");
        return;
      }
    }

    const { error: e } = await supabase
      .from("moderation_queue")
      .update({
        status: decision,
        admin_id: user?.id ?? null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", item.id);
    setBusy(false);
    if (e) {
      console.error("moderation update failed:", e);
      toast("Не удалось обновить запись. Попробуйте ещё раз.", "error");
      return;
    }
    await logAdminAction(`moderation_${decision}`, "moderation_queue", item.id, {
      entity_type: item.entity_type,
      entity_id: item.entity_id,
      comment: comment.trim() || null,
    });
    toast("Решение сохранено");
    closeConfirm();
    retry();
  };

  if (error) {
    return (
      <Card>
        <EmptyState
          icon={AlertCircle}
          title="Не удалось загрузить очередь модерации"
          text="Проверьте соединение и попробуйте ещё раз."
          action={<Button onClick={retry}>Повторить</Button>}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Очередь на проверку">
        {pending === null ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Всё проверено"
            text="Новые срабатывания контакт-фильтра появятся здесь."
          />
        ) : (
          <Table headers={["Тип", "Автор", "Содержимое", "Причина", "Дата", "Действия"]}>
            {pending.map((item) => (
              <tr key={item.id}>
                <td>
                  <Badge tone={item.entity_type === "message" ? "sky" : "teal"}>
                    {item.entity_type === "message" ? "Сообщение" : "Профиль"}
                  </Badge>
                </td>
                <td className="font-medium text-zinc-900">{item.authorName}</td>
                <td className="max-w-md">
                  <p className="line-clamp-2 text-zinc-700">{item.content}</p>
                </td>
                <td className="text-zinc-600">{item.reason || "—"}</td>
                <td className="whitespace-nowrap text-zinc-600">
                  {formatDateTime(item.created_at)}
                </td>
                <td>
                  <div className="flex gap-1">
                    <Button
                      variant="secondary"
                      className="px-2.5 py-1.5"
                      title="Одобрить — нарушений нет"
                      onClick={() => setConfirm({ item, decision: "approved" })}
                    >
                      <Check className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      variant="secondary"
                      className="px-2.5 py-1.5"
                      title="Скрыть контент"
                      onClick={() => setConfirm({ item, decision: "hidden" })}
                    >
                      <EyeOff className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      variant="danger"
                      className="px-2.5 py-1.5"
                      title="Забанить автора"
                      onClick={() => setConfirm({ item, decision: "banned" })}
                    >
                      <Ban className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card title="Обработанные">
        {resolved === null ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : resolved.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Истории пока нет"
            text="Обработанные записи появятся здесь."
          />
        ) : (
          <>
            <Table headers={["Тип", "Автор", "Содержимое", "Решение", "Дата решения"]}>
              {resolved.map((item) => {
                const meta = STATUS_BADGES[item.status] ?? { label: item.status, tone: "zinc" as const };
                return (
                  <tr key={item.id}>
                    <td>
                      <Badge tone={item.entity_type === "message" ? "sky" : "teal"}>
                        {item.entity_type === "message" ? "Сообщение" : "Профиль"}
                      </Badge>
                    </td>
                    <td className="font-medium text-zinc-900">{item.authorName}</td>
                    <td className="max-w-md">
                      <p className="line-clamp-1 text-zinc-600">{item.content}</p>
                    </td>
                    <td>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </td>
                    <td className="whitespace-nowrap text-zinc-600">
                      {formatDateTime(item.resolved_at)}
                    </td>
                  </tr>
                );
              })}
            </Table>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={resolvedTotal}
              onPage={(p) => {
                setResolved(null);
                setPage(p);
              }}
            />
          </>
        )}
      </Card>

      <Modal
        open={confirm !== null}
        onClose={closeConfirm}
        title={confirm ? `${DECISION_LABELS[confirm.decision]}?` : ""}
        footer={
          <>
            <Button variant="ghost" onClick={closeConfirm}>
              Отмена
            </Button>
            <Button
              variant={confirm?.decision === "banned" ? "danger" : "primary"}
              loading={busy}
              onClick={resolve}
            >
              {confirm ? DECISION_LABELS[confirm.decision] : ""}
            </Button>
          </>
        }
      >
        {confirm && (
          <div className="space-y-3">
            <div className="rounded-xl bg-zinc-50 p-3 text-sm">
              <div className="mb-1 font-medium text-zinc-900">{confirm.item.authorName}</div>
              <p className="text-zinc-700">{confirm.item.content}</p>
            </div>
            {confirm.decision === "approved" && (
              <p className="text-sm text-zinc-500">
                Запись будет помечена как проверенная, контент останется видимым.
              </p>
            )}
            {confirm.decision === "hidden" && (
              <p className="text-sm text-zinc-500">
                Запись будет помечена как скрытая. Автор не получит уведомления.
              </p>
            )}
            {confirm.decision === "banned" && (
              <>
                <p className="text-sm text-zinc-500">
                  Автор потеряет доступ к платформе. Запись будет помечена как «Бан».
                </p>
                <Textarea
                  label="Комментарий"
                  placeholder="Причина бана (попадёт в журнал действий)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
