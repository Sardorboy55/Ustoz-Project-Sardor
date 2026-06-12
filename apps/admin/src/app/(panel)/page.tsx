"use client";

// Дашборд: ключевые метрики платформы + последние брони и новые отзывы.
// Все запросы под RLS (is_admin → видно всё).

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Banknote,
  CalendarCheck2,
  CalendarX2,
  GraduationCap,
  Hourglass,
  MessageSquareText,
  Star,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import {
  formatDateTime,
  formatSum,
  tashkentDayRange,
  tashkentMonthRange,
} from "@/lib/format";
import {
  BookingStatusBadge,
  Button,
  Card,
  EmptyState,
  Skeleton,
  StatCard,
  Table,
} from "@/components/ui";

type Stats = {
  users: number;
  teachers: number;
  bookingsToday: number;
  pendingPayment: number;
  payoutsPending: number;
  gmvMonth: number; // тийины
};

type RecentBooking = {
  id: string;
  start_at: string;
  status: string;
  price: number;
  studentName: string;
  teacherName: string;
  subjectName: string;
};

type RecentReview = {
  booking_id: string;
  stars: number;
  body: string | null;
  created_at: string;
};

type DashboardData = {
  stats: Stats;
  bookings: RecentBooking[];
  reviews: RecentReview[];
};

async function fetchDashboard(): Promise<DashboardData> {
  const supabase = createClient();
  const day = tashkentDayRange();
  const month = tashkentMonthRange();

  const [
    usersRes,
    teachersRes,
    todayRes,
    pendingRes,
    payoutsRes,
    gmvRes,
    bookingsRes,
    reviewsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("teacher_profiles").select("user_id", { count: "exact", head: true }),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .gte("start_at", day.from)
      .lt("start_at", day.to),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_payment"),
    supabase
      .from("payout_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("bookings")
      .select("price")
      .in("status", ["paid", "completed"])
      .gte("start_at", month.from)
      .lt("start_at", month.to),
    supabase
      .from("bookings")
      .select(
        "id, start_at, status, price, student_id, teacher_id, teacher_subjects:teacher_subject_id ( subjects ( name_ru ) )",
      )
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("reviews")
      .select("booking_id, stars, body, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const failed = [
    usersRes.error,
    teachersRes.error,
    todayRes.error,
    pendingRes.error,
    payoutsRes.error,
    gmvRes.error,
    bookingsRes.error,
    reviewsRes.error,
  ].find(Boolean);
  if (failed) throw failed;

  // Имена — отдельными select'ами profiles (admin видит все).
  const rawBookings = (bookingsRes.data ?? []) as unknown as Array<{
    id: string;
    start_at: string;
    status: string;
    price: number;
    student_id: string;
    teacher_id: string;
    teacher_subjects: { subjects: { name_ru: string } | null } | null;
  }>;
  const ids = Array.from(
    new Set(rawBookings.flatMap((b) => [b.student_id, b.teacher_id])),
  );
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const { data: profileRows, error: profilesErr } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    if (profilesErr) throw profilesErr;
    for (const p of profileRows ?? []) names.set(p.id, p.full_name);
  }

  return {
    stats: {
      users: usersRes.count ?? 0,
      teachers: teachersRes.count ?? 0,
      bookingsToday: todayRes.count ?? 0,
      pendingPayment: pendingRes.count ?? 0,
      payoutsPending: payoutsRes.count ?? 0,
      gmvMonth: (gmvRes.data ?? []).reduce(
        (sum: number, b: { price: number | null }) => sum + (b.price ?? 0),
        0,
      ),
    },
    bookings: rawBookings.map((b) => ({
      id: b.id,
      start_at: b.start_at,
      status: b.status,
      price: b.price,
      studentName: names.get(b.student_id) || "—",
      teacherName: names.get(b.teacher_id) || "—",
      subjectName: b.teacher_subjects?.subjects?.name_ru ?? "—",
    })),
    reviews: (reviewsRes.data ?? []) as RecentReview[],
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [bookings, setBookings] = useState<RecentBooking[] | null>(null);
  const [reviews, setReviews] = useState<RecentReview[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  // Кнопка «Повторить»: сброс состояния в обработчике события,
  // сам fetch перезапускается через attempt в deps эффекта.
  const retry = useCallback(() => {
    setLoading(true);
    setError(false);
    setStats(null);
    setBookings(null);
    setReviews(null);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchDashboard()
      .then((data) => {
        if (cancelled) return;
        setStats(data.stats);
        setBookings(data.bookings);
        setReviews(data.reviews);
      })
      .catch((e) => {
        console.error("dashboard load failed:", e);
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (error) {
    return (
      <Card>
        <EmptyState
          icon={AlertCircle}
          title="Не удалось загрузить дашборд"
          text="Проверьте соединение и попробуйте ещё раз."
          action={<Button onClick={retry}>Повторить</Button>}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Пользователи"
          value={stats?.users ?? ""}
          icon={Users}
          loading={loading}
        />
        <StatCard
          label="Преподаватели"
          value={stats?.teachers ?? ""}
          icon={GraduationCap}
          loading={loading}
        />
        <StatCard
          label="Брони сегодня"
          value={stats?.bookingsToday ?? ""}
          icon={CalendarCheck2}
          loading={loading}
        />
        <StatCard
          label="Ожидают оплаты"
          value={stats?.pendingPayment ?? ""}
          icon={Hourglass}
          loading={loading}
        />
        <StatCard
          label="Выплаты в очереди"
          value={stats?.payoutsPending ?? ""}
          icon={Banknote}
          loading={loading}
        />
        <StatCard
          label="GMV за месяц"
          value={stats ? formatSum(stats.gmvMonth) : ""}
          icon={TrendingUp}
          loading={loading}
        />
        <StatCard
          label="Выручка (PRO)"
          value="—"
          icon={Wallet}
          hint="Появится после подключения оплат владельцем проекта"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Последние брони" className="xl:col-span-2">
          {loading || bookings === null ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <EmptyState
              icon={CalendarX2}
              title="Броней пока нет"
              text="Здесь появятся последние бронирования уроков."
            />
          ) : (
            <Table headers={["Ученик", "Преподаватель", "Предмет", "Дата", "Статус", "Цена"]}>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="font-medium text-zinc-900">{b.studentName}</td>
                  <td>{b.teacherName}</td>
                  <td className="text-zinc-600">{b.subjectName}</td>
                  <td className="whitespace-nowrap text-zinc-600">
                    {formatDateTime(b.start_at)}
                  </td>
                  <td>
                    <BookingStatusBadge status={b.status} />
                  </td>
                  <td className="whitespace-nowrap font-medium">
                    {b.price === 0 ? "Пробный" : formatSum(b.price)}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card title="Новые отзывы">
          {loading || reviews === null ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <EmptyState
              icon={MessageSquareText}
              title="Отзывов пока нет"
              text="Новые отзывы учеников появятся здесь."
            />
          ) : (
            <ul className="space-y-4">
              {reviews.map((r) => (
                <li
                  key={r.booking_id}
                  className="border-b border-zinc-100 pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-0.5" aria-label={`${r.stars} из 5`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={
                            i < r.stars
                              ? "h-4 w-4 fill-amber-400 text-amber-400"
                              : "h-4 w-4 text-zinc-200"
                          }
                          aria-hidden
                        />
                      ))}
                    </div>
                    <span className="text-xs text-zinc-400">
                      {formatDateTime(r.created_at)}
                    </span>
                  </div>
                  {r.body && (
                    <p className="mt-1.5 line-clamp-3 text-sm text-zinc-700">{r.body}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
