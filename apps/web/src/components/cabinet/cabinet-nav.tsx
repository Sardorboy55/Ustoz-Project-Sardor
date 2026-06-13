"use client";

import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CalendarDays,
  GraduationCap,
  Heart,
  LayoutDashboard,
  MessageCircle,
  UserRound,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

type NavItem = {
  href: string;
  labelKey: "home" | "lessons" | "messages" | "favorites" | "notifications" | "payments" | "profile";
  icon: LucideIcon;
};

const ITEMS: NavItem[] = [
  { href: "/cabinet", labelKey: "home", icon: LayoutDashboard },
  { href: "/cabinet/lessons", labelKey: "lessons", icon: CalendarDays },
  { href: "/cabinet/messages", labelKey: "messages", icon: MessageCircle },
  { href: "/cabinet/favorites", labelKey: "favorites", icon: Heart },
  { href: "/cabinet/notifications", labelKey: "notifications", icon: Bell },
  { href: "/cabinet/payments", labelKey: "payments", icon: Wallet },
  { href: "/cabinet/profile", labelKey: "profile", icon: UserRound },
];

function UnreadBadge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={label}
      className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold leading-none text-white"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** Cabinet navigation: sidebar on desktop, horizontal chips on mobile. */
export function CabinetNav({
  isTeacher,
  unreadCount,
}: {
  isTeacher: boolean;
  unreadCount: number;
}) {
  const t = useTranslations("Cabinet.nav");
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/cabinet" ? pathname === "/cabinet" : pathname.startsWith(href);

  const teacherLabel = isTeacher ? t("teacher") : t("becomeTeacher");
  const teacherActive = isActive("/cabinet/teacher");
  const unreadLabel = t("unreadAria", { count: unreadCount });

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 lg:block" aria-label={t("menu")}>
        <nav className="sticky top-24 space-y-1">
          {ITEMS.map(({ href, labelKey, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-600",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                )}
              >
                <Icon size={18} aria-hidden="true" className="shrink-0" />
                <span className="truncate">{t(labelKey)}</span>
                {labelKey === "notifications" && (
                  <UnreadBadge count={unreadCount} label={unreadLabel} />
                )}
              </Link>
            );
          })}

          <div className="!mt-3 border-t border-zinc-200 pt-3">
            <Link
              href="/cabinet/teacher"
              aria-current={teacherActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-600",
                teacherActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-brand-700 hover:bg-brand-50",
              )}
            >
              <GraduationCap size={18} aria-hidden="true" className="shrink-0" />
              <span className="truncate">{teacherLabel}</span>
            </Link>
          </div>
        </nav>
      </aside>

      {/* Mobile horizontal tabs */}
      <nav
        aria-label={t("menu")}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden [scrollbar-width:none]"
      >
        {[...ITEMS, null].map((item) => {
          if (item === null) {
            return (
              <Link
                key="teacher"
                href="/cabinet/teacher"
                aria-current={teacherActive ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-600",
                  teacherActive
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-brand-200 bg-brand-50 text-brand-700",
                )}
              >
                <GraduationCap size={15} aria-hidden="true" />
                {teacherLabel}
              </Link>
            );
          }
          const { href, labelKey, icon: Icon } = item;
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-600",
                active
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-brand-300",
              )}
            >
              <Icon size={15} aria-hidden="true" />
              {t(labelKey)}
              {labelKey === "notifications" && unreadCount > 0 && (
                <span
                  aria-label={unreadLabel}
                  className={cn(
                    "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none",
                    active ? "bg-white text-brand-700" : "bg-brand-600 text-white",
                  )}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
