"use client";

// Отзывы: фильтр по звёздам и скрытости, скрыть/показать (update is_hidden).
// Имена авторов отзывов намеренно не показываем — приватность учеников.

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Eye, EyeOff, MessageSquareText, Star } from "lucide-react";
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
  Select,
  Skeleton,
  Table,
  useToast,
} from "@/components/ui";

const PAGE_SIZE = 20;

type ReviewRow = {
  booking_id: string;
  teacher_id: string;
  stars: number;
  body: string | null;
  is_hidden: boolean;
  created_at: string;
  teacherName: string;
};

type Filters = { stars: string; hidden: string };

async function fetchReviews(
  filters: Filters,
  page: number,
): Promise<{ rows: ReviewRow[]; total: number }> {
  const supabase = createClient();
  let req = supabase
    .from("reviews")
    .select("booking_id, teacher_id, stars, body, is_hidden, created_at", {
      count: "exact",
    });
  if (filters.stars) req = req.eq("stars", Number(filters.stars));
  if (filters.hidden) req = req.eq("is_hidden", filters.hidden === "hidden");
  const { data, error, count } = await req
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (error) throw error;

  const raw = (data ?? []) as Array<Omit<ReviewRow, "teacherName">>;
  const ids = Array.from(new Set(raw.map((r) => r.teacher_id)));
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
    rows: raw.map((r) => ({ ...r, teacherName: names.get(r.teacher_id) || "—" })),
    total: count ?? 0,
  };
}

function Stars({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${count} из 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={
            i < count ? "h-4 w-4 fill-amber-400 text-amber-400" : "h-4 w-4 text-zinc-200"
          }
          aria-hidden
        />
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const toast = useToast();

  const [filters, setFilters] = useState<Filters>({ stars: "", hidden: "" });
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);

  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(false);

  const [confirm, setConfirm] = useState<ReviewRow | null>(null);
  const [busy, setBusy] = useState(false);

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
    fetchReviews(filters, page)
      .then((data) => {
        if (cancelled) return;
        setRows(data.rows);
        setTotal(data.total);
        setError(false);
      })
      .catch((e) => {
        console.error("reviews load failed:", e);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, page, attempt]);

  const toggleHidden = async () => {
    if (!confirm) return;
    setBusy(true);
    const supabase = createClient();
    const { error: e } = await supabase
      .from("reviews")
      .update({ is_hidden: !confirm.is_hidden })
      .eq("booking_id", confirm.booking_id);
    setBusy(false);
    if (e) {
      console.error("review update failed:", e);
      toast("Не удалось обновить отзыв. Попробуйте ещё раз.", "error");
      return;
    }
    await logAdminAction(
      confirm.is_hidden ? "review_show" : "review_hide",
      "reviews",
      confirm.booking_id,
      { stars: confirm.stars, teacher_id: confirm.teacher_id },
    );
    toast(confirm.is_hidden ? "Отзыв снова виден" : "Отзыв скрыт");
    setConfirm(null);
    retry();
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <Select
              label="Звёзды"
              value={filters.stars}
              onChange={(e) => applyFilters({ stars: e.target.value })}
            >
              <option value="">Все</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} ★
                </option>
              ))}
            </Select>
          </div>
          <div className="w-44">
            <Select
              label="Видимость"
              value={filters.hidden}
              onChange={(e) => applyFilters({ hidden: e.target.value })}
            >
              <option value="">Все</option>
              <option value="visible">Видимые</option>
              <option value="hidden">Скрытые</option>
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        {error ? (
          <EmptyState
            icon={AlertCircle}
            title="Не удалось загрузить отзывы"
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
            icon={MessageSquareText}
            title="Отзывов не найдено"
            text="Попробуйте изменить фильтры."
          />
        ) : (
          <>
            <Table headers={["Преподаватель", "Оценка", "Текст", "Дата", "Статус", ""]}>
              {rows.map((r) => (
                <tr key={r.booking_id}>
                  <td className="font-medium text-zinc-900">{r.teacherName}</td>
                  <td className="whitespace-nowrap">
                    <Stars count={r.stars} />
                  </td>
                  <td className="max-w-md">
                    <p className="line-clamp-2 text-zinc-700">{r.body || "—"}</p>
                  </td>
                  <td className="whitespace-nowrap text-zinc-600">
                    {formatDateTime(r.created_at)}
                  </td>
                  <td>
                    {r.is_hidden ? (
                      <Badge tone="red">Скрыт</Badge>
                    ) : (
                      <Badge tone="emerald">Виден</Badge>
                    )}
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      className="px-3 py-1.5"
                      onClick={() => setConfirm(r)}
                    >
                      {r.is_hidden ? (
                        <>
                          <Eye className="h-4 w-4" aria-hidden />
                          Показать
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-4 w-4" aria-hidden />
                          Скрыть
                        </>
                      )}
                    </Button>
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
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm?.is_hidden ? "Показать отзыв?" : "Скрыть отзыв?"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Отмена
            </Button>
            <Button
              variant={confirm?.is_hidden ? "primary" : "danger"}
              loading={busy}
              onClick={toggleHidden}
            >
              {confirm?.is_hidden ? "Показать" : "Скрыть"}
            </Button>
          </>
        }
      >
        {confirm && (
          <div className="space-y-2 text-sm">
            <p className="text-zinc-600">
              Отзыв о преподавателе <strong>{confirm.teacherName}</strong>:
            </p>
            <div className="rounded-xl bg-zinc-50 p-3">
              <Stars count={confirm.stars} />
              {confirm.body && <p className="mt-1 text-zinc-700">{confirm.body}</p>}
            </div>
            <p className="text-zinc-500">
              {confirm.is_hidden
                ? "Отзыв снова станет виден всем на странице преподавателя."
                : "Отзыв перестанет показываться на странице преподавателя, но останется в базе."}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
