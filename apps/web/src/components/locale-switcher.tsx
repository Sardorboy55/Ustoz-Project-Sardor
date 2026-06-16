"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LABELS: Record<string, string> = {
  uz: "O'zbekcha",
  ru: "Русский",
  en: "English",
};

/** Small inline-SVG flag (3:2) — reliable on every OS, unlike emoji flags. */
function Flag({ locale, className }: { locale: string; className?: string }) {
  if (locale === "ru") {
    return (
      <svg viewBox="0 0 9 6" className={className} aria-hidden="true">
        <rect width="9" height="6" fill="#ffffff" />
        <rect y="2" width="9" height="2" fill="#0039a6" />
        <rect y="4" width="9" height="2" fill="#d52b1e" />
      </svg>
    );
  }
  if (locale === "en") {
    // United States — stripes + star-field canton (stars simplified to dots).
    return (
      <svg viewBox="0 0 9 6" className={className} aria-hidden="true">
        <rect width="9" height="6" fill="#ffffff" />
        <g fill="#b22234">
          <rect width="9" height="0.462" y="0" />
          <rect width="9" height="0.462" y="0.923" />
          <rect width="9" height="0.462" y="1.846" />
          <rect width="9" height="0.462" y="2.769" />
          <rect width="9" height="0.462" y="3.692" />
          <rect width="9" height="0.462" y="4.615" />
          <rect width="9" height="0.462" y="5.538" />
        </g>
        <rect width="3.6" height="3.231" fill="#3c3b6e" />
        <g fill="#ffffff">
          <circle cx="0.6" cy="0.6" r="0.14" />
          <circle cx="1.4" cy="0.6" r="0.14" />
          <circle cx="2.2" cy="0.6" r="0.14" />
          <circle cx="3.0" cy="0.6" r="0.14" />
          <circle cx="0.6" cy="1.55" r="0.14" />
          <circle cx="1.4" cy="1.55" r="0.14" />
          <circle cx="2.2" cy="1.55" r="0.14" />
          <circle cx="3.0" cy="1.55" r="0.14" />
          <circle cx="0.6" cy="2.5" r="0.14" />
          <circle cx="1.4" cy="2.5" r="0.14" />
          <circle cx="2.2" cy="2.5" r="0.14" />
          <circle cx="3.0" cy="2.5" r="0.14" />
        </g>
      </svg>
    );
  }
  // uz
  return (
    <svg viewBox="0 0 9 6" className={className} aria-hidden="true">
      <rect width="9" height="6" fill="#ffffff" />
      <rect width="9" height="1.92" fill="#1eb1e2" />
      <rect y="4.08" width="9" height="1.92" fill="#1eb53a" />
      <rect y="1.92" width="9" height="0.14" fill="#ce1126" />
      <rect y="3.94" width="9" height="0.14" fill="#ce1126" />
      <circle cx="1.3" cy="0.96" r="0.6" fill="#ffffff" />
      <circle cx="1.55" cy="0.96" r="0.6" fill="#1eb1e2" />
      <circle cx="2.3" cy="0.55" r="0.1" fill="#ffffff" />
      <circle cx="2.3" cy="1.37" r="0.1" fill="#ffffff" />
      <circle cx="2.85" cy="0.96" r="0.1" fill="#ffffff" />
    </svg>
  );
}

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={LABELS[locale] ?? locale}
        className="flex items-center gap-1.5 rounded-lg px-1.5 py-1.5 outline-none transition hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-brand-600"
      >
        <span className="block overflow-hidden rounded-[3px] shadow-sm ring-1 ring-zinc-200">
          <Flag locale={locale} className="block h-4 w-6" />
        </span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-1.5 min-w-[160px] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg"
        >
          {routing.locales.map((l) => (
            <Link
              key={l}
              href={pathname}
              locale={l}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm transition ${
                l === locale
                  ? "bg-brand-50 font-semibold text-brand-700"
                  : "text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              <span className="block overflow-hidden rounded-[3px] ring-1 ring-zinc-200">
                <Flag locale={l} className="block h-4 w-6" />
              </span>
              {LABELS[l] ?? l}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
