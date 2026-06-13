"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AuthButton } from "@/components/auth-button";

/** Burger menu for the site header (visible below md). */
export function MobileMenu() {
  const t = useTranslations("Header");
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const linkClasses =
    "rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-brand-700";

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? t("closeMenu") : t("menu")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-700 transition-colors hover:bg-zinc-100"
      >
        {open ? (
          <X size={22} aria-hidden="true" />
        ) : (
          <Menu size={22} aria-hidden="true" />
        )}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-40 border-b border-zinc-200 bg-white shadow-md">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 sm:px-6">
            <Link href="/catalog" onClick={close} className={linkClasses}>
              {t("catalog")}
            </Link>
            <Link href="/become-teacher" onClick={close} className={linkClasses}>
              {t("forTeachers")}
            </Link>
            <div className="mt-2 border-t border-zinc-100 pt-3" onClick={close}>
              <AuthButton block />
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
