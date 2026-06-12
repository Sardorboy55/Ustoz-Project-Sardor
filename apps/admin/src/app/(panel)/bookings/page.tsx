"use client";

// Брони: фильтры по статусу и дате (Ташкент), модал деталей.
// Принудительные действия отключены до появления сервисного слоя —
// edge-функции нельзя звать от чужого имени.

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CalendarX2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { BOOKING_STATUS, formatDateTime, formatSum } from "@/lib/format";
import {
  BookingStatusBadge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Table,
} from "@/components/ui";

const PAGE_SIZE = 20;

const KIND_LABELS: Record<string, string> = {
  regular: "Обычный урок",
  trial_free: "Бесплатный пробный",
  trial_discount: "Пробный со скидкой",
  package: "Из пакета",
};

type BookingRow = {
  id: string;
  start_at: string;
  duration_min: number;
  price: number;
  status: string;
  kind: string;
  cancel_reason: string | null;
  created_at: string;
  student_id: string;
  teacher_id: string;
  studentName: string;
  teacherName: string;
  subjectName: string;
};

type Filters = { status: string; date: string }; // date: "YYYY-MM-DD" по Ташкенту

async function fetchBookings(
  filters: Filters,
  page: number,
): Promise<{ rows: BookingRow[]; total: number }> {
  const supabase = createClient();
  let req = supabase
    .from("bookings")
    .select(
      "id, start_at, duration_min, price, status, kind, cancel_reason, created_at, student_id, teacher_id, teacher_subjects:teacher_subject_id ( subjects ( name_ru ) )",
      { count: "exact" },
    );
  if (filters.status) req = req.eq("status", filters.status);
  if (filters.date) {
    // день по Ташкенту (UTC+5, без DST)
    const from = new Date(`${filters.date}T00:00:00+05:00`);
    const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
    req = req.gte("start_at", from.toISOString()).lt("start_at", to.toISOString());
  }
  const { data, error, count } = await req
    .order("start_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (error) throw error;

  const raw = (data ?? []) as unknown as Array<
    Omit<BookingRow, "studentName" | "teacherName" | "subjectName"> & {
      teacher_subjects: { subjects: { name_ru: string } | null } | null;
    }
  >;
  const ids = Array.from(new Set(raw.flatMap((b) => [b.student_id, b.teacher_id])));
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
    rows: raw.map((b) => ({
      ...b,
      studentName: names.get(b.student_id) || "—",
      teacherName: names.get(b.teacher_id) || "—",
      subjectName: b.teacher_subjects?.subjects?.name_ru ?? "—",
    })),
    total: count ?? 0,
  };
}

export default function BookingsPage() {
  const [filters, setFilters] = useState<Filters>({ status: "", date: "" });
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);

  const [rows, setRows] = useState<BookingRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<BookingRow | null>(null);

  // loading = rows === null; сбрасываем rows в обработчиках, не в эффекте
  const retry = useCallback(() => {
    setError(false);
    setRows(null);
    setAttempt((n) => n + 1);
  }, []);

  const applyFilters = (patch: Partial<Filters>) => {
    setRows(null);
    setError(false);
    setPage(0);
    setFilters((f) => ({ ...f, ...patch }));
    // bump: повторное применение тех же фильтров тоже перезагружает
    setAttempt((n) => n + 1);
  };

  useEffect(() => {
    let cancelled = false;
    fetchBookings(filters, page)
      .then((data) => {
        if (cancelled) return;
        setRows(data.rows);
        setTotal(data.total);
        setError(false);
      })
      .catch((e) => {
        console.error("bookings load failed:", e);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, page, attempt]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-56">
            <Select
              label="Статус"
              value={filters.status}
              onChange={(e) => applyFilters({ status: e.target.value })}
            >
              <option value="">Все статусы</option>
              {Object.entries(BOOKING_STATUS).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-48">
            <Input
              label="Дата урока (Ташкент)"
              type="date"
              value={filters.date}
              onChange={(e) => applyFilters({ date: e.target.value })}
            />
          </div>
          {(filters.status || filters.date) && (
            <Button
              variant="ghost"
              onClick={() => applyFilters({ status: "", date: "" })}
            >
              Сбросить
            </Button>
          )}
        </div>
      </Card>

      <Card>
        {error ? (
          <EmptyState
            icon={AlertCircle}
            title="Не удалось загрузить брони"
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
            icon={CalendarX2}
            title="Броней не найдено"
            text="Попробуйте изменить фильтры."
          />
        ) : (
          <>
            <Table
              headers={[
                "Дата урока",
                "Ученик",
                "Преподаватель",
                "Длительность",
                "Цена",
                "Статус",
                "Создано",
              ]}
            >
              {rows.map((b) => (
                <tr key={b.id} className="cursor-pointer" onClick={() => setSelected(b)}>
                  <td className="whitespace-nowrap font-medium text-zinc-900">
                    {formatDateTime(b.start_at)}
                  </td>
                  <td>{b.studentName}</td>
                  <td>{b.teacherName}</td>
                  <td className="whitespace-nowrap text-zinc-600">{b.duration_min} мин</td>
                  <td className="whitespace-nowrap">
                    {b.price === 0 ? "Пробный" : formatSum(b.price)}
                  </td>
                  <td>
                    <BookingStatusBadge status={b.status} />
                  </td>
                  <td className="whitespace-nowrap text-zinc-500">
                    {formatDateTime(b.created_at)}
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
        onClose={() => setSelected(null)}
        title="Детали брони"
        footer={
          <Button
            variant="secondary"
            disabled
            title="Принудительная отмена — после подключения сервисного слоя"
          >
            Принудительная отмена (скоро)
          </Button>
        }
      >
        {selected && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-zinc-500">Ученик</dt>
            <dd className="text-zinc-900">{selected.studentName}</dd>
            <dt className="text-zinc-500">Преподаватель</dt>
            <dd className="text-zinc-900">{selected.teacherName}</dd>
            <dt className="text-zinc-500">Предмет</dt>
            <dd className="text-zinc-900">{selected.subjectName}</dd>
            <dt className="text-zinc-500">Тип</dt>
            <dd className="text-zinc-900">{KIND_LABELS[selected.kind] ?? selected.kind}</dd>
            <dt className="text-zinc-500">Дата урока</dt>
            <dd className="text-zinc-900">{formatDateTime(selected.start_at)}</dd>
            <dt className="text-zinc-500">Длительность</dt>
            <dd className="text-zinc-900">{selected.duration_min} мин</dd>
            <dt className="text-zinc-500">Цена</dt>
            <dd className="font-medium text-zinc-900">
              {selected.price === 0 ? "Бесплатно" : formatSum(selected.price)}
            </dd>
            <dt className="text-zinc-500">Статус</dt>
            <dd>
              <BookingStatusBadge status={selected.status} />
            </dd>
            <dt className="text-zinc-500">Создано</dt>
            <dd className="text-zinc-900">{formatDateTime(selected.created_at)}</dd>
            {selected.cancel_reason && (
              <>
                <dt className="text-zinc-500">Причина отмены</dt>
                <dd className="text-zinc-900">{selected.cancel_reason}</dd>
              </>
            )}
            <dt className="text-zinc-500">ID</dt>
            <dd className="break-all font-mono text-xs text-zinc-500">{selected.id}</dd>
          </dl>
        )}
      </Modal>
    </div>
  );
}
