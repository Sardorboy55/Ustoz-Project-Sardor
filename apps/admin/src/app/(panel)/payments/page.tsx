"use client";

// Платежи: read-only таблица payments. Провайдеры (Payme/Click/Uzum)
// подключаются владельцем проекта — до этого таблица пуста, ручной
// возврат отключён.

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase";
import {
  PAYMENT_STATUS,
  formatDateTime,
  formatSum,
  type PaymentStatus,
} from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Pagination,
  Select,
  Skeleton,
  Table,
} from "@/components/ui";

const PAGE_SIZE = 20;

const PROVIDER_LABELS: Record<string, string> = {
  payme: "Payme",
  click: "Click",
  uzum: "Uzum",
  internal_balance: "Внутренний баланс",
};

type PaymentRow = {
  id: string;
  provider: string;
  amount: number;
  status: string;
  external_id: string | null;
  booking_id: string | null;
  created_at: string;
  userName: string;
};

async function fetchPayments(
  status: string,
  page: number,
): Promise<{ rows: PaymentRow[]; total: number }> {
  const supabase = createClient();
  let req = supabase
    .from("payments")
    .select("id, user_id, provider, amount, status, external_id, booking_id, created_at", {
      count: "exact",
    });
  if (status) req = req.eq("status", status);
  const { data, error, count } = await req
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (error) throw error;

  const raw = (data ?? []) as Array<Omit<PaymentRow, "userName"> & { user_id: string }>;
  const ids = Array.from(new Set(raw.map((p) => p.user_id)));
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const { data: profileRows, error: pErr } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    if (pErr) throw pErr;
    for (const p of profileRows ?? []) names.set(p.id, p.full_name);
  }

  return {
    rows: raw.map((p) => ({ ...p, userName: names.get(p.user_id) || "—" })),
    total: count ?? 0,
  };
}

function PaymentStatusBadge({ status }: { status: string }) {
  const meta = PAYMENT_STATUS[status as PaymentStatus];
  if (!meta) return <Badge>{status}</Badge>;
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export default function PaymentsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);

  const [rows, setRows] = useState<PaymentRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(false);

  // loading = rows === null; сбрасываем rows в обработчиках, не в эффекте
  const retry = useCallback(() => {
    setError(false);
    setRows(null);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchPayments(status, page)
      .then((data) => {
        if (cancelled) return;
        setRows(data.rows);
        setTotal(data.total);
        setError(false);
      })
      .catch((e) => {
        console.error("payments load failed:", e);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [status, page, attempt]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="w-56">
            <Select
              label="Статус"
              value={status}
              onChange={(e) => {
                setRows(null);
                setError(false);
                setPage(0);
                setStatus(e.target.value);
              }}
            >
              <option value="">Все статусы</option>
              {Object.entries(PAYMENT_STATUS).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </Select>
          </div>
          <Button
            variant="secondary"
            disabled
            title="Ручной возврат появится после подключения платёжных провайдеров"
          >
            Ручной возврат (скоро)
          </Button>
        </div>
      </Card>

      <Card>
        {error ? (
          <EmptyState
            icon={AlertCircle}
            title="Не удалось загрузить платежи"
            text="Проверьте соединение и попробуйте ещё раз."
            action={<Button onClick={retry}>Повторить</Button>}
          />
        ) : rows === null ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="Платежей пока нет"
            text="Платежи появятся после подключения провайдеров (Payme, Click, Uzum) владельцем проекта."
          />
        ) : (
          <>
            <Table
              headers={[
                "Пользователь",
                "Провайдер",
                "Сумма",
                "Статус",
                "ID транзакции",
                "Бронь",
                "Дата",
              ]}
            >
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium text-zinc-900">{p.userName}</td>
                  <td>{PROVIDER_LABELS[p.provider] ?? p.provider}</td>
                  <td className="whitespace-nowrap font-medium">{formatSum(p.amount)}</td>
                  <td>
                    <PaymentStatusBadge status={p.status} />
                  </td>
                  <td className="font-mono text-xs text-zinc-500">
                    {p.external_id || "—"}
                  </td>
                  <td className="font-mono text-xs text-zinc-500">
                    {p.booking_id ? `${p.booking_id.slice(0, 8)}…` : "—"}
                  </td>
                  <td className="whitespace-nowrap text-zinc-600">
                    {formatDateTime(p.created_at)}
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
    </div>
  );
}
