"use client";

// Преподаватели: фильтры tier/флаг модерации, verified/флаг/страйки/бан.
// Все действия идут через SECURITY DEFINER RPC, которые сами пишут аудит-лог.

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Ban,
  BadgeCheck,
  Eraser,
  ExternalLink,
  Flag,
  GraduationCap,
  Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { ilikeSafe } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Table,
  Textarea,
  useToast,
} from "@/components/ui";

const PAGE_SIZE = 20;
const SITE_URL = "http://localhost:3000";

type TeacherRow = {
  user_id: string;
  slug: string;
  rating_avg: number;
  rating_count: number;
  lessons_done: number;
  cancel_strikes: number;
  tier: "free" | "pro";
  is_verified: boolean;
  moderation_flag: boolean;
  profile: { full_name: string; phone: string; is_banned: boolean };
};

type Filters = { query: string; tier: string; flag: string };

async function fetchTeachers(
  filters: Filters,
  page: number,
): Promise<{ rows: TeacherRow[]; total: number }> {
  const supabase = createClient();
  let req = supabase
    .from("teacher_profiles")
    .select(
      // hint !user_id обязателен: через student_favorites есть второй
      // (m2m) путь между teacher_profiles и profiles
      "user_id, slug, rating_avg, rating_count, lessons_done, cancel_strikes, tier, is_verified, moderation_flag, profile:profiles!user_id!inner (full_name, phone, is_banned)",
      { count: "exact" },
    );
  const q = ilikeSafe(filters.query);
  if (q) {
    req = req.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`, {
      referencedTable: "profile",
    });
  }
  if (filters.tier) req = req.eq("tier", filters.tier);
  if (filters.flag) req = req.eq("moderation_flag", filters.flag === "flagged");
  const { data, error, count } = await req
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (error) throw error;
  return { rows: (data ?? []) as unknown as TeacherRow[], total: count ?? 0 };
}

type Action = "verified" | "flag" | "strikes" | "ban";

const ACTION_TITLES: Record<Action, (t: TeacherRow) => string> = {
  verified: (t) => (t.is_verified ? "Снять значок Verified?" : "Выдать значок Verified?"),
  flag: (t) =>
    t.moderation_flag ? "Снять флаг модерации?" : "Поставить флаг модерации?",
  strikes: () => "Сбросить страйки отмен?",
  ban: (t) => (t.profile.is_banned ? "Разбанить преподавателя?" : "Забанить преподавателя?"),
};

export default function TeachersPage() {
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({ query: "", tier: "", flag: "" });
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);

  const [rows, setRows] = useState<TeacherRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(false);

  const [confirm, setConfirm] = useState<{ teacher: TeacherRow; action: Action } | null>(
    null,
  );
  const [comment, setComment] = useState("");
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
    fetchTeachers(filters, page)
      .then((data) => {
        if (cancelled) return;
        setRows(data.rows);
        setTotal(data.total);
        setError(false);
      })
      .catch((e) => {
        console.error("teachers load failed:", e);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, page, attempt]);

  const closeConfirm = () => {
    setConfirm(null);
    setComment("");
  };

  const runAction = async () => {
    if (!confirm) return;
    const { teacher, action } = confirm;
    setBusy(true);
    const supabase = createClient();

    let e: { message: string } | null = null;
    if (action === "ban") {
      ({ error: e } = await supabase.rpc("admin_set_user_banned", {
        p_user_id: teacher.user_id,
        p_banned: !teacher.profile.is_banned,
        p_comment: comment.trim() || null,
      }));
    } else {
      ({ error: e } = await supabase.rpc("admin_set_teacher_flags", {
        p_teacher_id: teacher.user_id,
        p_moderation_flag: action === "flag" ? !teacher.moderation_flag : null,
        p_is_verified: action === "verified" ? !teacher.is_verified : null,
        p_reset_strikes: action === "strikes",
      }));
    }
    setBusy(false);
    if (e) {
      console.error("teacher action failed:", e);
      toast("Не удалось выполнить действие. Попробуйте ещё раз.", "error");
      return;
    }
    // RPC сами пишут в admin_audit_log
    toast("Готово");
    closeConfirm();
    retry();
  };

  return (
    <div className="space-y-4">
      <Card>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            applyFilters({ query: search });
          }}
        >
          <div className="w-64">
            <Input
              label="Поиск"
              placeholder="Имя или телефон"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-40">
            <Select
              label="Тариф"
              value={filters.tier}
              onChange={(e) => applyFilters({ tier: e.target.value })}
            >
              <option value="">Все</option>
              <option value="free">FREE</option>
              <option value="pro">PRO</option>
            </Select>
          </div>
          <div className="w-44">
            <Select
              label="Модерация"
              value={filters.flag}
              onChange={(e) => applyFilters({ flag: e.target.value })}
            >
              <option value="">Все</option>
              <option value="flagged">С флагом</option>
              <option value="clean">Без флага</option>
            </Select>
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
            title="Не удалось загрузить преподавателей"
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
            icon={GraduationCap}
            title="Преподаватели не найдены"
            text="Попробуйте изменить фильтры."
          />
        ) : (
          <>
            <Table
              headers={[
                "Имя",
                "Профиль",
                "Рейтинг",
                "Уроки",
                "Страйки",
                "Тариф",
                "Статус",
                "Действия",
              ]}
            >
              {rows.map((t) => (
                <tr key={t.user_id}>
                  <td>
                    <div className="font-medium text-zinc-900">
                      {t.profile.full_name || "—"}
                    </div>
                    <div className="text-xs text-zinc-500">{t.profile.phone}</div>
                  </td>
                  <td>
                    <a
                      href={`${SITE_URL}/t/${t.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
                    >
                      /t/{t.slug}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  </td>
                  <td className="whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
                      {Number(t.rating_avg).toFixed(1)}
                      <span className="text-xs text-zinc-400">({t.rating_count})</span>
                    </span>
                  </td>
                  <td>{t.lessons_done}</td>
                  <td>
                    {t.cancel_strikes > 0 ? (
                      <Badge tone="orange">{t.cancel_strikes}</Badge>
                    ) : (
                      <span className="text-zinc-400">0</span>
                    )}
                  </td>
                  <td>
                    {t.tier === "pro" ? (
                      <Badge tone="amber">PRO</Badge>
                    ) : (
                      <Badge tone="zinc">FREE</Badge>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {t.profile.is_banned && <Badge tone="red">Бан</Badge>}
                      {t.is_verified && <Badge tone="teal">Verified</Badge>}
                      {t.moderation_flag && <Badge tone="orange">Флаг</Badge>}
                      {!t.profile.is_banned && !t.is_verified && !t.moderation_flag && (
                        <span className="text-zinc-400">—</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        title={t.is_verified ? "Снять Verified" : "Выдать Verified"}
                        onClick={() => setConfirm({ teacher: t, action: "verified" })}
                        className={`rounded-lg p-1.5 hover:bg-zinc-100 ${
                          t.is_verified ? "text-brand" : "text-zinc-400"
                        }`}
                      >
                        <BadgeCheck className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        title={t.moderation_flag ? "Снять флаг" : "Поставить флаг"}
                        onClick={() => setConfirm({ teacher: t, action: "flag" })}
                        className={`rounded-lg p-1.5 hover:bg-zinc-100 ${
                          t.moderation_flag ? "text-orange-600" : "text-zinc-400"
                        }`}
                      >
                        <Flag className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        title="Сбросить страйки"
                        disabled={t.cancel_strikes === 0}
                        onClick={() => setConfirm({ teacher: t, action: "strikes" })}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Eraser className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        title={t.profile.is_banned ? "Разбанить" : "Забанить"}
                        onClick={() => setConfirm({ teacher: t, action: "ban" })}
                        className={`rounded-lg p-1.5 hover:bg-zinc-100 ${
                          t.profile.is_banned ? "text-red-600" : "text-zinc-400"
                        }`}
                      >
                        <Ban className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
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
        onClose={closeConfirm}
        title={confirm ? ACTION_TITLES[confirm.action](confirm.teacher) : ""}
        footer={
          <>
            <Button variant="ghost" onClick={closeConfirm}>
              Отмена
            </Button>
            <Button
              variant={
                confirm?.action === "ban" && !confirm.teacher.profile.is_banned
                  ? "danger"
                  : "primary"
              }
              loading={busy}
              onClick={runAction}
            >
              Подтвердить
            </Button>
          </>
        }
      >
        {confirm && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-600">
              {confirm.teacher.profile.full_name || confirm.teacher.profile.phone} (
              /t/{confirm.teacher.slug})
            </p>
            {confirm.action === "ban" && (
              <Textarea
                label="Комментарий"
                placeholder="Причина (попадёт в журнал действий)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
