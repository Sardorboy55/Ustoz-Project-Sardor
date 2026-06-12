"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <span className="flex gap-1 rounded-lg border border-zinc-200 p-0.5 text-xs font-semibold">
      {routing.locales.map((l) => (
        <Link
          key={l}
          href={pathname}
          locale={l}
          className={`rounded-md px-2 py-1 uppercase ${
            l === locale ? "bg-teal-700 text-white" : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          {l}
        </Link>
      ))}
    </span>
  );
}
