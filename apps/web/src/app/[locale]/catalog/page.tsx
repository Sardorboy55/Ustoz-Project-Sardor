import type { Metadata } from "next";
import Form from "next/form";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname, Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import {
  fetchCatalog,
  fetchCategories,
  fetchSubjects,
  type CatalogCard,
} from "@/lib/catalog";
import { Card } from "@/components/ui/card";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FavoritesProvider } from "@/components/favorites";
import { TeacherCard } from "@/components/teacher-card";
import { AutoSubmit } from "@/components/catalog/auto-submit";
import { FiltersPanel } from "@/components/catalog/filters-panel";

const PER_PAGE = 20;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Catalog" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

type CatalogSearchParams = {
  q?: string;
  category?: string;
  subject?: string;
  price_min?: string;
  price_max?: string;
  rating?: string;
  lang?: string;
  trial?: string;
  sort?: string;
  page?: string;
};

/** Page numbers with ellipsis gaps: 1 … 4 [5] 6 … 12 */
function pageNumbers(current: number, total: number): Array<number | "gap"> {
  const wanted = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...wanted].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: Array<number | "gap"> = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push("gap");
    out.push(p);
    prev = p;
  }
  return out;
}

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<CatalogSearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "Catalog" });

  let categories: Awaited<ReturnType<typeof fetchCategories>> = [];
  let subjects: Awaited<ReturnType<typeof fetchSubjects>> = [];
  let cards: CatalogCard[] = [];
  let failed = false;

  try {
    categories = await fetchCategories();
  } catch {
    /* selects degrade to "all" */
  }
  const category = categories.find((c) => c.slug === sp.category);
  try {
    subjects = await fetchSubjects(category?.id);
  } catch {
    /* selects degrade to "all" */
  }
  const subject = subjects.find((s) => s.slug === sp.subject);

  const page = Math.max(1, Number(sp.page) || 1);
  try {
    cards = await fetchCatalog({
      query: sp.q?.trim() || undefined,
      categoryId: category?.id,
      subjectId: subject?.id,
      priceMin: Number(sp.price_min) || undefined,
      priceMax: Number(sp.price_max) || undefined,
      ratingMin: sp.rating === "4" ? 4 : undefined,
      lang: sp.lang || undefined,
      trialOnly: sp.trial === "1",
      sort: (sp.sort as never) || "recommended",
      page,
      perPage: PER_PAGE,
    });
  } catch {
    failed = true;
  }

  const total = cards[0]?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const name = (row: { name_uz: string; name_ru: string }) =>
    locale === "ru" ? row.name_ru : row.name_uz;
  const fmtNum = (v: string) =>
    Number(v).toLocaleString(locale === "ru" ? "ru-RU" : "uz-UZ");
  const langLabels: Record<string, string> = {
    uz: t("langUz"),
    ru: t("langRu"),
    en: t("langEn"),
  };

  /** Current params minus `page` and the given keys (for chip-removal links). */
  const queryWithout = (drop: string[] = []) =>
    Object.fromEntries(
      Object.entries(sp).filter(
        ([key, value]) => value && key !== "page" && !drop.includes(key),
      ),
    );

  const pageQuery = (p: number) => {
    const query = queryWithout();
    return p > 1 ? { ...query, page: String(p) } : query;
  };

  /** Active filter chips (search + filters; sort is not a "filter"). */
  const chips: Array<{ key: string; label: string; drop: string[] }> = [];
  if (sp.q?.trim()) chips.push({ key: "q", label: `“${sp.q.trim()}”`, drop: ["q"] });
  if (category)
    chips.push({ key: "category", label: name(category), drop: ["category", "subject"] });
  if (subject) chips.push({ key: "subject", label: name(subject), drop: ["subject"] });
  if (Number(sp.price_min))
    chips.push({
      key: "price_min",
      label: t("chipPriceMin", { price: fmtNum(sp.price_min!) }),
      drop: ["price_min"],
    });
  if (Number(sp.price_max))
    chips.push({
      key: "price_max",
      label: t("chipPriceMax", { price: fmtNum(sp.price_max!) }),
      drop: ["price_max"],
    });
  if (sp.rating === "4") chips.push({ key: "rating", label: t("chipRating"), drop: ["rating"] });
  if (sp.lang && langLabels[sp.lang])
    chips.push({ key: "lang", label: langLabels[sp.lang], drop: ["lang"] });
  if (sp.trial === "1")
    chips.push({ key: "trial", label: t("freeTrialBadge"), drop: ["trial"] });

  const catalogPath = getPathname({ locale, href: "/catalog" });
  // Remount form fields when the URL params change, so uncontrolled inputs
  // pick up fresh defaults after chip-removal / reset navigations.
  const fieldsKey = JSON.stringify(queryWithout().valueOf()) + (sp.sort ?? "");

  const selectClasses =
    "h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
      <p className="mt-1.5 text-zinc-500">{t("subtitle")}</p>

      <Form action={catalogPath} key={fieldsKey} className="mt-6">
        <AutoSubmit />

        {/* Search row */}
        <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
          <Search size={18} aria-hidden="true" className="ml-2 shrink-0 text-zinc-400" />
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder={t("searchPlaceholder")}
            className="h-10 w-full min-w-0 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
          />
          <button type="submit" className={buttonClasses("primary", "sm", "shrink-0")}>
            {t("search")}
          </button>
        </div>

        <div className="mt-6 items-start lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8">
          {/* ============================ Filters ============================ */}
          <FiltersPanel label={t("filters")} activeCount={chips.length}>
            <Card className="p-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-bold text-zinc-900">{t("filters")}</h2>
                {chips.length > 0 && (
                  <Link
                    href="/catalog"
                    className="text-xs font-semibold text-brand-700 hover:text-brand-800"
                  >
                    {t("resetAll")}
                  </Link>
                )}
              </div>

              <div className="mt-4 space-y-4">
                <Select
                  label={t("category")}
                  name="category"
                  defaultValue={sp.category ?? ""}
                >
                  <option value="">{t("allCategories")}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug ?? ""}>
                      {name(c)}
                    </option>
                  ))}
                </Select>

                <Select label={t("subject")} name="subject" defaultValue={sp.subject ?? ""}>
                  <option value="">{t("allSubjects")}</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.slug}>
                      {name(s)}
                    </option>
                  ))}
                </Select>

                <fieldset>
                  <legend className="mb-1.5 block text-sm font-medium text-zinc-700">
                    {t("price")}
                  </legend>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      name="price_min"
                      defaultValue={sp.price_min ?? ""}
                      placeholder={t("priceMin")}
                      inputMode="numeric"
                      aria-label={`${t("price")} — ${t("priceMin")}`}
                    />
                    <Input
                      name="price_max"
                      defaultValue={sp.price_max ?? ""}
                      placeholder={t("priceMax")}
                      inputMode="numeric"
                      aria-label={`${t("price")} — ${t("priceMax")}`}
                    />
                  </div>
                </fieldset>

                <Select label={t("language")} name="lang" defaultValue={sp.lang ?? ""}>
                  <option value="">{t("anyLang")}</option>
                  <option value="uz">{t("langUz")}</option>
                  <option value="ru">{t("langRu")}</option>
                  <option value="en">{t("langEn")}</option>
                </Select>

                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    name="rating"
                    value="4"
                    defaultChecked={sp.rating === "4"}
                    className="h-4 w-4 rounded border-zinc-300 accent-brand-600"
                  />
                  {t("rating4plus")}
                </label>

                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    name="trial"
                    value="1"
                    defaultChecked={sp.trial === "1"}
                    className="h-4 w-4 rounded border-zinc-300 accent-brand-600"
                  />
                  {t("freeTrialOnly")}
                </label>

                <button type="submit" className={buttonClasses("primary", "md", "w-full")}>
                  {t("apply")}
                </button>
              </div>
            </Card>
          </FiltersPanel>

          {/* ============================ Results ============================ */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <p className="text-sm text-zinc-500" data-testid="catalog-count">
                {failed ? "—" : t("found", { count: total })}
              </p>
              <label className="flex items-center gap-2 text-sm text-zinc-500">
                {t("sortLabel")}
                <select
                  name="sort"
                  defaultValue={sp.sort ?? "recommended"}
                  className={selectClasses}
                >
                  <option value="recommended">{t("sortRecommended")}</option>
                  <option value="price_asc">{t("sortPriceAsc")}</option>
                  <option value="price_desc">{t("sortPriceDesc")}</option>
                  <option value="rating">{t("sortRating")}</option>
                </select>
              </label>
            </div>

            {chips.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {chips.map((chip) => (
                  <Link
                    key={chip.key}
                    href={{ pathname: "/catalog", query: queryWithout(chip.drop) }}
                    aria-label={t("removeFilter", { label: chip.label })}
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pl-3.5 pr-2.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-100"
                  >
                    {chip.label}
                    <X size={14} aria-hidden="true" />
                  </Link>
                ))}
                <Link
                  href="/catalog"
                  className="px-2 text-sm font-semibold text-zinc-500 hover:text-zinc-700"
                >
                  {t("resetAll")}
                </Link>
              </div>
            )}

            <div className="mt-5">
              {failed ? (
                <ErrorState retryHref="/catalog" />
              ) : cards.length === 0 ? (
                <EmptyState
                  title={t("emptyTitle")}
                  description={t("emptyDescription")}
                  action={
                    <ButtonLink href="/catalog" variant="secondary">
                      {t("emptyReset")}
                    </ButtonLink>
                  }
                />
              ) : (
                <FavoritesProvider>
                  <div className="grid gap-4">
                    {cards.map((card) => (
                      <TeacherCard key={card.user_id} card={card} />
                    ))}
                  </div>
                </FavoritesProvider>
              )}
            </div>

            {!failed && totalPages > 1 && (
              <nav
                aria-label={t("paginationAria")}
                className="mt-8 flex flex-wrap items-center justify-center gap-2"
              >
                {page > 1 ? (
                  <Link
                    href={{ pathname: "/catalog", query: pageQuery(page - 1) }}
                    className={buttonClasses("ghost", "sm")}
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                    {t("prev")}
                  </Link>
                ) : (
                  <span className={buttonClasses("ghost", "sm", "pointer-events-none text-zinc-300")}>
                    <ChevronLeft size={16} aria-hidden="true" />
                    {t("prev")}
                  </span>
                )}

                {pageNumbers(page, totalPages).map((p, i) =>
                  p === "gap" ? (
                    <span key={`gap-${i}`} className="px-1 text-zinc-400">
                      …
                    </span>
                  ) : (
                    <Link
                      key={p}
                      href={{ pathname: "/catalog", query: pageQuery(p) }}
                      aria-label={t("pageN", { page: p })}
                      aria-current={p === page ? "page" : undefined}
                      className={cn(
                        "flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm font-semibold transition-colors",
                        p === page
                          ? "bg-brand-600 text-white"
                          : "text-zinc-700 hover:bg-zinc-100",
                      )}
                    >
                      {p}
                    </Link>
                  ),
                )}

                {page < totalPages ? (
                  <Link
                    href={{ pathname: "/catalog", query: pageQuery(page + 1) }}
                    className={buttonClasses("ghost", "sm")}
                  >
                    {t("next")}
                    <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                ) : (
                  <span className={buttonClasses("ghost", "sm", "pointer-events-none text-zinc-300")}>
                    {t("next")}
                    <ChevronRight size={16} aria-hidden="true" />
                  </span>
                )}
              </nav>
            )}
          </section>
        </div>
      </Form>
    </main>
  );
}
