"use client";

// Выплаты: очередь pending сверху (Выплачено/Отклонить через
// wallet_resolve_payout — RPC сам пишет аудит-лог), история ниже.

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Banknote, CheckCircle2, History, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { formatDateTime, formatSum } from "@/lib/format";
import {
  Button,
  Card,
  EmptyState,
  Modal,
  Pagination,
  PayoutStatusBadge,
  Skeleton,
  Table,
  Textarea,
  useToast,
} from "@/components/ui";

const PAGE_SIZE = 20;

type PayoutRow = {
  id: string;
  teacher_id: string;
  amount: number;
  card_number: string;
  status: string;
  admin_comment: string | null;
  created_at: string;
  resolved_at: string | null;
  teacherName: string;
  teacherPhone: string;
  walletBalance: number | null;
  walletFrozen: number | null;
};

async function withTeacherInfo(
  raw: Array<Omit<PayoutRow, "teacherName" | "teacherPhone" | "walletBalance" | "walletFrozen">>,
  includeWallets: boolean,
): Promise<PayoutRow[]> {
  const supabase = createClient();
  const ids = Array.from(new Set(raw.map((r) => r.teacher_id)));
  const names = new Map<string, { name: string; phone: string }>();
  const wallets = new Map<string, { balance: number; frozen: number }>();
  if (ids.length > 0) {
    const { data: profileRows, error: pErr } = await supabase
      .from("profiles")
      .select("id, full_name, phone")
      .in("id", ids);
    if (pErr) throw pErr;
    for (const p of profileRows ?? [])
      names.set(p.id, { name: p.full_name, phone: p.phone });
    if (includeWallets) {
      const { data: walletRows, error: wErr } = await supabase
        .from("wallets")
        .select("teacher_id, balance, frozen")
        .in("teacher_id", ids);
      if (wErr) throw wErr;
      for (const w of walletRows ?? [])
        wallets.set(w.teacher_id, { balance: w.balance, frozen: w.frozen });
    }
  }
  return raw.map((r) => ({
    ...r,
    teacherName: names.get(r.teacher_id)?.name || "—",
    teacherPhone: names.get(r.teacher_id)?.phone || "",
    walletBalance: wallets.get(r.teacher_id)?.balance ?? null,
    walletFrozen: wallets.get(r.teacher_id)?.frozen ?? null,
  }));
}

const PAYOUT_FIELDS =
  "id, teacher_id, amount, card_number, status, admin_comment, created_at, resolved_at";

async function fetchPending(): Promise<PayoutRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payout_requests")
    .select(PAYOUT_FIELDS)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return withTeacherInfo(data ?? [], true);
}

async function fetchHistory(page: number): Promise<{ rows: PayoutRow[]; total: number }> {
  const supabase = createClient();
  const { data, error, count } = await supabase
    .from("payout_requests")
    .select(PAYOUT_FIELDS, { count: "exact" })
    .neq("status", "pending")
    .order("resolved_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (error) throw error;
  return { rows: await withTeacherInfo(data ?? [], false), total: count ?? 0 };
}

export default function PayoutsPage() {
  const toast = useToast();

  const [pending, setPending] = useState<PayoutRow[] | null>(null);
  const [history, setHistory] = useState<PayoutRow[] | null>(null);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState(false);

  const [confirm, setConfirm] = useState<{ payout: PayoutRow; approve: boolean } | null>(
    null,
  );
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  // loading = pending/history === null; сбрасываем в обработчиках, не в эффекте
  const retry = useCallback(() => {
    setError(false);
    setPending(null);
    setHistory(null);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchPending(), fetchHistory(page)])
      .then(([pendingRows, historyData]) => {
        if (cancelled) return;
        setPending(pendingRows);
        setHistory(historyData.rows);
        setHistoryTotal(historyData.total);
        setError(false);
      })
      .catch((e) => {
        console.error("payouts load failed:", e);
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
    if (!confirm.approve && !comment.trim()) {
      toast("Укажите причину отклонения.", "error");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error: e } = await supabase.rpc("wallet_resolve_payout", {
      p_payout_id: confirm.payout.id,
      p_approve: confirm.approve,
      p_comment: comment.trim() || null,
    });
    setBusy(false);
    if (e) {
      console.error("wallet_resolve_payout failed:", e);
      toast(
        e.message?.includes("ALREADY_RESOLVED")
          ? "Заявка уже обработана другим админом."
          : "Не удалось обработать заявку. Попробуйте ещё раз.",
        "error",
      );
      return;
    }
    // wallet_resolve_payout сам пишет в admin_audit_log
    toast(confirm.approve ? "Выплата отмечена выполненной" : "Заявка отклонена");
    closeConfirm();
    retry();
  };

  if (error) {
    return (
      <Card>
        <EmptyState
          icon={AlertCircle}
          title="Не удалось загрузить выплаты"
          text="Проверьте соединение и попробуйте ещё раз."
          action={<Button onClick={retry}>Повторить</Button>}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Очередь на выплату">
        {pending === null ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title="Очередь пуста"
            text="Новые заявки преподавателей на вывод средств появятся здесь."
          />
        ) : (
          <Table
            headers={[
              "Преподаватель",
              "Сумма",
              "Карта",
              "Заявка от",
              "Кошелёк (доступно / заморожено)",
              "Действия",
            ]}
          >
            {pending.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="font-medium text-zinc-900">{p.teacherName}</div>
                  <div className="text-xs text-zinc-500">{p.teacherPhone}</div>
                </td>
                <td className="whitespace-nowrap font-semibold text-zinc-900">
                  {formatSum(p.amount)}
                </td>
                <td className="whitespace-nowrap font-mono text-xs text-zinc-600">
                  {p.card_number.replace(/(\d{4})(?=\d)/g, "$1 ")}
                </td>
                <td className="whitespace-nowrap text-zinc-600">
                  {formatDateTime(p.created_at)}
                </td>
                <td className="whitespace-nowrap text-zinc-600">
                  {p.walletBalance === null
                    ? "—"
                    : `${formatSum(p.walletBalance)} / ${formatSum(p.walletFrozen)}`}
                </td>
                <td>
                  <div className="flex gap-2">
                    <Button
                      className="px-3 py-1.5"
                      onClick={() => setConfirm({ payout: p, approve: true })}
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                      Выплачено
                    </Button>
                    <Button
                      variant="danger"
                      className="px-3 py-1.5"
                      onClick={() => setConfirm({ payout: p, approve: false })}
                    >
                      <XCircle className="h-4 w-4" aria-hidden />
                      Отклонить
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card title="История выплат">
        {history === null ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <EmptyState
            icon={History}
            title="Истории пока нет"
            text="Обработанные заявки на выплату появятся здесь."
          />
        ) : (
          <>
            <Table
              headers={[
                "Преподаватель",
                "Сумма",
                "Карта",
                "Статус",
                "Комментарий",
                "Решение",
              ]}
            >
              {history.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium text-zinc-900">{p.teacherName}</td>
                  <td className="whitespace-nowrap">{formatSum(p.amount)}</td>
                  <td className="whitespace-nowrap font-mono text-xs text-zinc-600">
                    {p.card_number}
                  </td>
                  <td>
                    <PayoutStatusBadge status={p.status} />
                  </td>
                  <td className="max-w-60 truncate text-zinc-600" title={p.admin_comment ?? ""}>
                    {p.admin_comment || "—"}
                  </td>
                  <td className="whitespace-nowrap text-zinc-600">
                    {formatDateTime(p.resolved_at)}
                  </td>
                </tr>
              ))}
            </Table>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={historyTotal}
              onPage={(p) => {
                setHistory(null);
                setPage(p);
              }}
            />
          </>
        )}
      </Card>

      <Modal
        open={confirm !== null}
        onClose={closeConfirm}
        title={confirm?.approve ? "Подтвердить выплату?" : "Отклонить заявку?"}
        footer={
          <>
            <Button variant="ghost" onClick={closeConfirm}>
              Отмена
            </Button>
            <Button
              variant={confirm?.approve ? "primary" : "danger"}
              loading={busy}
              onClick={resolve}
            >
              {confirm?.approve ? "Да, выплачено" : "Отклонить"}
            </Button>
          </>
        }
      >
        {confirm && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-600">
              {confirm.payout.teacherName} · <strong>{formatSum(confirm.payout.amount)}</strong>{" "}
              на карту {confirm.payout.card_number.replace(/(\d{4})(?=\d)/g, "$1 ")}.
              {confirm.approve
                ? " Подтверждайте только после фактического перевода денег."
                : " Замороженная сумма вернётся на баланс преподавателя."}
            </p>
            <Textarea
              label={confirm.approve ? "Комментарий" : "Причина отклонения (обязательно)"}
              placeholder={
                confirm.approve ? "Например, номер перевода" : "Почему заявка отклонена"
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
