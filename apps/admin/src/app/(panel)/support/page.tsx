"use client";

// Поддержка: открытые тикеты с ответом (закрывает тикет), вкладка закрытых.

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, LifeBuoy } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { logAdminAction } from "@/lib/audit";
import { formatDateTime } from "@/lib/format";
import {
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

type Ticket = {
  id: string;
  user_id: string;
  subject: string;
  body: string;
  status: "open" | "closed";
  admin_reply: string | null;
  created_at: string;
  resolved_at: string | null;
  userName: string;
  userPhone: string;
};

async function fetchTickets(
  status: "open" | "closed",
  page: number,
): Promise<{ rows: Ticket[]; total: number }> {
  const supabase = createClient();
  const { data, error, count } = await supabase
    .from("support_tickets")
    .select("id, user_id, subject, body, status, admin_reply, created_at, resolved_at", {
      count: "exact",
    })
    .eq("status", status)
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (error) throw error;

  const raw = (data ?? []) as Array<Omit<Ticket, "userName" | "userPhone">>;
  const ids = Array.from(new Set(raw.map((t) => t.user_id)));
  const users = new Map<string, { name: string; phone: string }>();
  if (ids.length > 0) {
    const { data: profileRows, error: pErr } = await supabase
      .from("profiles")
      .select("id, full_name, phone")
      .in("id", ids);
    if (pErr) throw pErr;
    for (const p of profileRows ?? []) users.set(p.id, { name: p.full_name, phone: p.phone });
  }

  return {
    rows: raw.map((t) => ({
      ...t,
      userName: users.get(t.user_id)?.name || "—",
      userPhone: users.get(t.user_id)?.phone || "",
    })),
    total: count ?? 0,
  };
}

export default function SupportPage() {
  const toast = useToast();

  const [tab, setTab] = useState<"open" | "closed">("open");
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);

  const [rows, setRows] = useState<Ticket[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(false);

  const [selected, setSelected] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  // loading = rows === null; сбрасываем rows в обработчиках, не в эффекте
  const retry = useCallback(() => {
    setError(false);
    setRows(null);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchTickets(tab, page)
      .then((data) => {
        if (cancelled) return;
        setRows(data.rows);
        setTotal(data.total);
        setError(false);
      })
      .catch((e) => {
        console.error("support load failed:", e);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, page, attempt]);

  const closeModal = () => {
    setSelected(null);
    setReply("");
  };

  const sendReply = async () => {
    if (!selected) return;
    if (!reply.trim()) {
      toast("Введите текст ответа.", "error");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: e } = await supabase
      .from("support_tickets")
      .update({
        admin_reply: reply.trim(),
        status: "closed",
        admin_id: user?.id ?? null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", selected.id);
    setBusy(false);
    if (e) {
      console.error("ticket reply failed:", e);
      toast("Не удалось отправить ответ. Попробуйте ещё раз.", "error");
      return;
    }
    await logAdminAction("support_ticket_close", "support_tickets", selected.id, {
      subject: selected.subject,
    });
    toast("Ответ отправлен, тикет закрыт");
    closeModal();
    retry();
  };

  const tabButton = (key: "open" | "closed", label: string) => (
    <button
      type="button"
      onClick={() => {
        if (key === tab) return; // клик по активной вкладке — ничего не делаем
        setRows(null);
        setError(false);
        setPage(0);
        setTab(key);
      }}
      className={
        tab === key
          ? "rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white"
          : "rounded-full px-4 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
      }
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 self-start rounded-full border border-zinc-200 bg-white p-1 w-fit">
        {tabButton("open", "Открытые")}
        {tabButton("closed", "Закрытые")}
      </div>

      <Card>
        {error ? (
          <EmptyState
            icon={AlertCircle}
            title="Не удалось загрузить тикеты"
            text="Проверьте соединение и попробуйте ещё раз."
            action={<Button onClick={retry}>Повторить</Button>}
          />
        ) : rows === null ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={LifeBuoy}
            title={tab === "open" ? "Открытых тикетов нет" : "Закрытых тикетов нет"}
            text={
              tab === "open"
                ? "Все обращения обработаны. Новые появятся здесь."
                : "Закрытые обращения появятся здесь."
            }
          />
        ) : (
          <>
            <Table
              headers={
                tab === "open"
                  ? ["Пользователь", "Тема", "Текст", "Создан"]
                  : ["Пользователь", "Тема", "Ответ", "Закрыт"]
              }
            >
              {rows.map((t) => (
                <tr key={t.id} className="cursor-pointer" onClick={() => setSelected(t)}>
                  <td>
                    <div className="font-medium text-zinc-900">{t.userName}</div>
                    <div className="text-xs text-zinc-500">{t.userPhone}</div>
                  </td>
                  <td className="font-medium text-zinc-800">{t.subject}</td>
                  <td className="max-w-md">
                    <p className="line-clamp-2 text-zinc-600">
                      {tab === "open" ? t.body : t.admin_reply || "—"}
                    </p>
                  </td>
                  <td className="whitespace-nowrap text-zinc-600">
                    {formatDateTime(tab === "open" ? t.created_at : t.resolved_at)}
                  </td>
                </tr>
              ))}
            </Table>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPage={(p) => {
                setRows(null);
                setPage(p);
              }}
            />
          </>
        )}
      </Card>

      <Modal
        open={selected !== null}
        onClose={closeModal}
        title={selected?.subject ?? "Тикет"}
        footer={
          selected?.status === "open" ? (
            <>
              <Button variant="ghost" onClick={closeModal}>
                Отмена
              </Button>
              <Button loading={busy} onClick={sendReply}>
                Отправить и закрыть
              </Button>
            </>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-3 text-sm">
            <p className="text-zinc-500">
              {selected.userName} · {selected.userPhone} ·{" "}
              {formatDateTime(selected.created_at)}
            </p>
            <div className="whitespace-pre-wrap rounded-xl bg-zinc-50 p-3 text-zinc-800">
              {selected.body}
            </div>
            {selected.status === "open" ? (
              <Textarea
                label="Ответ пользователю"
                placeholder="Текст ответа — пользователь увидит его в приложении"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
            ) : (
              <div>
                <div className="mb-1 text-sm font-medium text-zinc-700">Ответ поддержки</div>
                <div className="whitespace-pre-wrap rounded-xl bg-brand-tint p-3 text-zinc-800">
                  {selected.admin_reply || "—"}
                </div>
                {selected.resolved_at && (
                  <p className="mt-1 text-xs text-zinc-400">
                    Закрыт {formatDateTime(selected.resolved_at)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
