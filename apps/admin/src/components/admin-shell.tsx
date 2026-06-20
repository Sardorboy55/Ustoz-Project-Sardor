"use client";

// Оболочка админки: client-side гейт (сессия + profiles.is_admin),
// sidebar с разделами и topbar. Не залогинен → /login; не админ →
// signOut + /login?reason=forbidden. RLS всё равно не отдаст данные
// не-админу — гейт здесь только для UX.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  Banknote,
  CalendarCheck2,
  ClipboardCheck,
  CreditCard,
  FolderTree,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Settings,
  ShieldAlert,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Spinner, ToastProvider } from "@/components/ui";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV: NavItem[] = [
  { href: "/", label: "Дашборд", icon: LayoutDashboard },
  { href: "/users", label: "Пользователи", icon: Users },
  { href: "/teachers", label: "Преподаватели", icon: GraduationCap },
  { href: "/applications", label: "Заявки преп.", icon: ClipboardCheck },
  { href: "/bookings", label: "Брони", icon: CalendarCheck2 },
  { href: "/payments", label: "Платежи", icon: CreditCard },
  { href: "/payment-confirmations", label: "Оплаты (QR)", icon: BadgeCheck },
  { href: "/payouts", label: "Выплаты", icon: Banknote },
  { href: "/reviews", label: "Отзывы", icon: Star },
  { href: "/categories", label: "Категории", icon: FolderTree },
  { href: "/moderation", label: "Модерация", icon: ShieldAlert },
  { href: "/support", label: "Поддержка", icon: LifeBuoy },
  { href: "/settings", label: "Настройки", icon: Settings },
];

type AdminInfo = { name: string; avatarUrl: string | null };

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminInfo | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, is_admin")
        .eq("id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!profile?.is_admin) {
        await supabase.auth.signOut();
        router.replace("/login?reason=forbidden");
        return;
      }
      setAdmin({
        name: profile.full_name || "Администратор",
        avatarUrl: profile.avatar_url,
      });
    };
    check();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/login");
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
    // router стабилен между рендерами
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sectionTitle = useMemo(() => {
    const match = NAV.filter(
      (item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)),
    ).sort((a, b) => b.href.length - a.href.length)[0];
    return match?.label ?? "IBILIM Admin";
  }, [pathname]);

  const signOut = async () => {
    await createClient().auth.signOut();
    router.replace("/login");
  };

  if (!admin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <div className="text-lg font-extrabold tracking-wide text-brand">
          IBILIM <span className="font-medium text-zinc-400">admin</span>
        </div>
        <Spinner />
        <p className="text-sm text-zinc-500">Проверяем доступ…</p>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-zinc-200 bg-white">
          <div className="px-5 pb-2 pt-5 text-lg font-extrabold tracking-wide text-brand">
            IBILIM <span className="font-medium text-zinc-400">admin</span>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
            {NAV.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    active
                      ? "flex items-center gap-3 rounded-xl bg-brand-tint px-3 py-2 text-sm font-semibold text-brand-dark"
                      : "flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-zinc-100 px-5 py-3 text-xs text-zinc-400">
            Внутренний инструмент IBILIM
          </div>
        </aside>

        <div className="ml-60 flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white/90 px-6 py-3 backdrop-blur">
            <h1 className="text-lg font-bold text-zinc-900">{sectionTitle}</h1>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {admin.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={admin.avatarUrl}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-tint text-sm font-bold text-brand">
                    {admin.name.trim().charAt(0).toUpperCase() || "A"}
                  </div>
                )}
                <span className="hidden text-sm font-medium text-zinc-700 sm:block">
                  {admin.name}
                </span>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Выйти
              </button>
            </div>
          </header>
          <main className="flex-1 px-6 py-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
