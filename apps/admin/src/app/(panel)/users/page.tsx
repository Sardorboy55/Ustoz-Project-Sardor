"use client";

// Пользователи: поиск по телефону/имени, карточка юзера с последними бронями,
// бан/разбан и корректировка баланса (RPC сами пишут в admin_audit_log).

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Ban, UsersRound, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { formatDateTime, formatSum, ilikeSafe } from "@/lib/format";
import {
  Badge,
  BookingStatusBadge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Pagination,
  Skeleton,
  Table,
  Textarea,
  useToast,
} from "@/components/ui";

const PAGE_SIZE = 20;

type UserRow = {
  id: string;
  phone: string;
  full_name: string;
  is_teacher: boolean;
  is_admin: boolean;
  is_banned: boolean;
  student_balance: number;
  created_at: string;
};

type UserBooking = {
  id: string;
  start_at: string;
  status: string;
  price: number;
  duration_min: number;
  student_id: string;
};

async function fetchUsers(
  query: string,
  page: number,
): Promise<{ rows: UserRow[]; total: number }> {
  const supabase = createClient();
  let req = supabase
    .from("profiles")
    .select(
      "id, phone, full_name, is_teacher, is_admin, is_banned, student_balance, created_at",
      { count: "exact" },
    );
  const q = ilikeSafe(query);
  if (q) req = req.or(`phone.ilike.%${q}%,full_name.ilike.%${q}%`);
  const { data, error, count } = await req
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (error) throw error;
  return { rows: (data ?? []) as UserRow[], total: count ?? 0 };
}

async function fetchUserBookings(userId: string): Promise<UserBooking[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id, start_at, status, price, duration_min, student_id")
    .or(`student_id.eq.${userId},teacher_id.eq.${userId}`)
    .order("start_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data ?? []) as UserBooking[];
}

function roleBadge(u: UserRow) {
  if (u.is_admin) return <Badge tone="teal">Админ</Badge>;
  if (u.is_teacher) return <Badge tone="sky">Преподаватель</Badge>;
  return <Badge tone="zinc">Ученик</Badge>;
}

export default function UsersPage() {
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);

  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(false);

  // карточка юзера
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [bookings, setBookings] = useState<UserBooking[] | null>(null);
  const [bookingsError, setBookingsError] = useState(false);

  // действия
  const [action, setAction] = useState<"ban" | "balance" | null>(null);
  const [comment, setComment] = useState("");
  const [amount, setAmount] = useState(""); // сумы, ±
  const [busy, setBusy] = useState(false);

  // loading = rows === null && !error; сбрасываем rows в обработчиках,
  // а не в эффекте (eslint react-hooks/set-state-in-effect)
  const retry = useCallback(() => {
    setError(false);
    setRows(null);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchUsers(query, page)
      .then((data) => {
        if (cancelled) return;
        setRows(data.rows);
        setTotal(data.total);
        setError(false);
      })
      .catch((e) => {
        console.error("users load failed:", e);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [query, page, attempt]);

  // открыть карточку юзера (сбрасываем стейт броней здесь, не в эффекте)
  const openUser = (u: UserRow) => {
    setBookings(null);
    setBookingsError(false);
    setSelected(u);
  };

  // последние брони выбранного юзера
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    fetchUserBookings(selected.id)
      .then((data) => {
        if (!cancelled) setBookings(data);
      })
      .catch((e) => {
        console.error("user bookings load failed:", e);
        if (!cancelled) setBookingsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const closeAction = () => {
    setAction(null);
    setComment("");
    setAmount("");
  };

  const runBan = async () => {
    if (!selected) return;
    setBusy(true);
    const supabase = createClient();
    const { error: e } = await supabase.rpc("admin_set_user_banned", {
      p_user_id: selected.id,
      p_banned: !selected.is_banned,
      p_comment: comment.trim() || null,
    });
    setBusy(false);
    if (e) {
      console.error("admin_set_user_banned failed:", e);
      toast("Не удалось изменить статус. Попробуйте ещё раз.", "error");
      return;
    }
    // admin_set_user_banned сам пишет в admin_audit_log
    toast(selected.is_banned ? "Пользователь разбанен" : "Пользователь забанен");
    closeAction();
    setSelected(null);
    retry();
  };

  const runBalance = async () => {
    if (!selected) return;
    const sum = Math.round(Number(amount));
    if (!Number.isFinite(sum) || sum === 0) {
      toast("Укажите сумму (положительную или отрицательную).", "error");
      return;
    }
    if (!comment.trim()) {
      toast("Комментарий обязателен.", "error");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error: e } = await supabase.rpc("admin_adjust_student_balance", {
      p_student_id: selected.id,
      p_amount: sum * 100, // сумы → тийины
      p_comment: comment.trim(),
    });
    setBusy(false);
    if (e) {
      console.error("admin_adjust_student_balance failed:", e);
      toast(
        e.message?.includes("student_balance")
          ? "Баланс не может стать отрицательным."
          : "Не удалось изменить баланс. Попробуйте ещё раз.",
        "error",
      );
      return;
    }
    // admin_adjust_student_balance сам пишет в admin_audit_log
    toast("Баланс обновлён");
    closeAction();
    setSelected(null);
    retry();
  };

  return (
    <div className="space-y-4">
      <Card>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setRows(null);
            setError(false);
            setPage(0);
            setQuery(search);
            // bump: повторный сабмит с тем же запросом тоже перезагружает
            setAttempt((n) => n + 1);
          }}
        >
          <div className="w-72">
            <Input
              label="Поиск"
              placeholder="Телефон или имя"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary">
            Найти
          </Button>
        </form>
      </Card>

      <Card>
        {error ? (
          <EmptyState
            icon={AlertCircle}
            title="Не удалось загрузить пользователей"
            text="Проверьте соединение и попробуйте ещё раз."
            action={<Button onClick={retry}>Повторить</Button>}
          />
        ) : rows === null ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="Никого не нашли"
            text={query ? "Попробуйте изменить запрос." : "Пользователи появятся после регистрации."}
          />
        ) : (
          <>
            <Table headers={["Имя", "Телефон", "Роль", "Баланс", "Статус", "Регистрация"]}>
              {rows.map((u) => (
                <tr
                  key={u.id}
                  className="cursor-pointer"
                  onClick={() => openUser(u)}
                >
                  <td className="font-medium text-zinc-900">{u.full_name || "—"}</td>
                  <td className="whitespace-nowrap text-zinc-600">{u.phone}</td>
                  <td>{roleBadge(u)}</td>
                  <td className="whitespace-nowrap">{formatSum(u.student_balance)}</td>
                  <td>
                    {u.is_banned ? (
                      <Badge tone="red">Бан</Badge>
                    ) : (
                      <Badge tone="emerald">Активен</Badge>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-zinc-600">
                    {formatDateTime(u.created_at)}
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

      {/* Карточка юзера */}
      <Modal
        open={selected !== null && action === null}
        onClose={() => setSelected(null)}
        title={selected?.full_name || "Пользователь"}
        footer={
          selected ? (
            <>
              <Button
                variant="secondary"
                onClick={() => setAction("balance")}
              >
                <Wallet className="h-4 w-4" aria-hidden />
                Баланс
              </Button>
              <Button
                variant={selected.is_banned ? "secondary" : "danger"}
                onClick={() => setAction("ban")}
              >
                <Ban className="h-4 w-4" aria-hidden />
                {selected.is_banned ? "Разбанить" : "Забанить"}
              </Button>
            </>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-zinc-500">Телефон</dt>
              <dd className="text-zinc-900">{selected.phone}</dd>
              <dt className="text-zinc-500">Роль</dt>
              <dd>{roleBadge(selected)}</dd>
              <dt className="text-zinc-500">Баланс</dt>
              <dd className="font-medium text-zinc-900">
                {formatSum(selected.student_balance)}
              </dd>
              <dt className="text-zinc-500">Статус</dt>
              <dd>
                {selected.is_banned ? (
                  <Badge tone="red">Бан</Badge>
                ) : (
                  <Badge tone="emerald">Активен</Badge>
                )}
              </dd>
              <dt className="text-zinc-500">Регистрация</dt>
              <dd className="text-zinc-900">{formatDateTime(selected.created_at)}</dd>
            </dl>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-zinc-900">
                Последние брони
              </h4>
              {bookingsError ? (
                <p className="text-sm text-zinc-500">Не удалось загрузить брони.</p>
              ) : bookings === null ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : bookings.length === 0 ? (
                <p className="text-sm text-zinc-500">Броней пока нет.</p>
              ) : (
                <ul className="space-y-2">
                  {bookings.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-zinc-50 px-3 py-2 text-sm"
                    >
                      <span className="whitespace-nowrap text-zinc-700">
                        {formatDateTime(b.start_at)} · {b.duration_min} мин
                        {b.student_id === selected.id ? "" : " · как преподаватель"}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="whitespace-nowrap text-zinc-500">
                          {b.price === 0 ? "Пробный" : formatSum(b.price)}
                        </span>
                        <BookingStatusBadge status={b.status} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Бан / разбан */}
      <Modal
        open={action === "ban"}
        onClose={closeAction}
        title={selected?.is_banned ? "Разбанить пользователя?" : "Забанить пользователя?"}
        footer={
          <>
            <Button variant="ghost" onClick={closeAction}>
              Отмена
            </Button>
            <Button
              variant={selected?.is_banned ? "primary" : "danger"}
              loading={busy}
              onClick={runBan}
            >
              {selected?.is_banned ? "Разбанить" : "Забанить"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-zinc-600">
            {selected?.full_name || selected?.phone} —{" "}
            {selected?.is_banned
              ? "доступ к платформе будет восстановлен."
              : "пользователь потеряет доступ к платформе."}
          </p>
          <Textarea
            label="Комментарий"
            placeholder="Причина (попадёт в журнал действий)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
      </Modal>

      {/* Корректировка баланса */}
      <Modal
        open={action === "balance"}
        onClose={closeAction}
        title="Корректировка баланса"
        footer={
          <>
            <Button variant="ghost" onClick={closeAction}>
              Отмена
            </Button>
            <Button loading={busy} onClick={runBalance}>
              Применить
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-zinc-600">
            Текущий баланс: <strong>{formatSum(selected?.student_balance)}</strong>.
            Укажите сумму в сумах — положительную для пополнения, отрицательную для
            списания.
          </p>
          <Input
            label="Сумма (сум)"
            type="number"
            step="1"
            placeholder="Например, 50000 или -20000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Textarea
            label="Комментарий (обязательно)"
            placeholder="Причина корректировки"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
