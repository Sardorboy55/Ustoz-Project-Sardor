import { Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button, ButtonLink } from "@/components/ui/button";

/** Friendly 404 with a catalog search and an escape hatch. */
export default function NotFoundPage() {
  const t = useTranslations("Errors");
  const locale = useLocale();
  // Plain <form action> needs a literal path — prefix manually for /ru.
  const catalogPath = locale === "ru" ? "/ru/catalog" : "/catalog";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
      <p className="text-7xl font-extrabold tracking-tight text-brand-200">
        404
      </p>
      <h1 className="mt-4 text-2xl font-bold text-zinc-900">
        {t("notFoundTitle")}
      </h1>
      <p className="mt-2 max-w-md text-zinc-500">{t("notFoundDescription")}</p>

      <form action={catalogPath} className="mt-8 flex w-full max-w-md gap-2">
        <label htmlFor="nf-search" className="sr-only">
          {t("searchPlaceholder")}
        </label>
        <div className="relative flex-1">
          <Search
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            id="nf-search"
            name="q"
            placeholder={t("searchPlaceholder")}
            className="h-11 w-full rounded-xl border border-zinc-300 bg-white pl-10 pr-3.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
          />
        </div>
        <Button type="submit">{t("searchCta")}</Button>
      </form>

      <ButtonLink href="/catalog" variant="ghost" size="sm" className="mt-4">
        {t("goCatalog")}
      </ButtonLink>
    </main>
  );
}
