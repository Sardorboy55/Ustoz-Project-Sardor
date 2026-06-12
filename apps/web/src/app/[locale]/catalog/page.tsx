import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { fetchCatalog, fetchCategories, fetchSubjects } from "@/lib/catalog";
import { TeacherCard } from "@/components/teacher-card";
import { LocaleSwitcher } from "@/components/locale-switcher";

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

type Search = {
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

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Search>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "Catalog" });

  const categories = await fetchCategories();
  const category = categories.find((c) => c.slug === sp.category);
  const subjects = await fetchSubjects(category?.id);
  const subject = subjects.find((s) => s.slug === sp.subject);

  const page = Math.max(1, Number(sp.page) || 1);
  const cards = await fetchCatalog({
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
  });
  const total = cards[0]?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  const name = (row: { name_uz: string; name_ru: string }) =>
    locale === "ru" ? row.name_ru : row.name_uz;

  return (
    <>
      <header className="border-b border-zinc-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-extrabold tracking-wide text-teal-700">
            USTOZ
          </Link>
          <div className="flex items-center gap-4">
            <LocaleSwitcher />
            <Link
              href="/auth"
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white"
            >
              {t("signIn")}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <h1 className="text-2xl font-bold">{t("title")}</h1>

        {/* GET-form filters — fully server-rendered */}
        <form method="GET" className="mt-5 grid gap-3 rounded-2xl border border-zinc-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder={t("searchPlaceholder")}
            className="rounded-xl border border-zinc-300 px-3 py-2 lg:col-span-2"
          />
          <select name="category" defaultValue={sp.category ?? ""} className="rounded-xl border border-zinc-300 px-3 py-2">
            <option value="">{t("allCategories")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug ?? ""}>{name(c)}</option>
            ))}
          </select>
          <select name="subject" defaultValue={sp.subject ?? ""} className="rounded-xl border border-zinc-300 px-3 py-2">
            <option value="">{t("allSubjects")}</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.slug}>{name(s)}</option>
            ))}
          </select>
          <input
            name="price_min"
            defaultValue={sp.price_min ?? ""}
            placeholder={t("priceMin")}
            inputMode="numeric"
            className="rounded-xl border border-zinc-300 px-3 py-2"
          />
          <input
            name="price_max"
            defaultValue={sp.price_max ?? ""}
            placeholder={t("priceMax")}
            inputMode="numeric"
            className="rounded-xl border border-zinc-300 px-3 py-2"
          />
          <select name="lang" defaultValue={sp.lang ?? ""} className="rounded-xl border border-zinc-300 px-3 py-2">
            <option value="">{t("anyLang")}</option>
            <option value="uz">O&apos;zbekcha</option>
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
          <select name="sort" defaultValue={sp.sort ?? "recommended"} className="rounded-xl border border-zinc-300 px-3 py-2">
            <option value="recommended">{t("sortRecommended")}</option>
            <option value="price_asc">{t("sortPriceAsc")}</option>
            <option value="price_desc">{t("sortPriceDesc")}</option>
            <option value="rating">{t("sortRating")}</option>
          </select>
          <label className="flex items-center gap-2 px-1 text-sm text-zinc-700">
            <input type="checkbox" name="trial" value="1" defaultChecked={sp.trial === "1"} />
            {t("freeTrialOnly")}
          </label>
          <label className="flex items-center gap-2 px-1 text-sm text-zinc-700">
            <input type="checkbox" name="rating" value="4" defaultChecked={sp.rating === "4"} />
            {t("rating4plus")}
          </label>
          <button className="rounded-xl bg-teal-700 px-4 py-2 font-medium text-white lg:col-start-4">
            {t("apply")}
          </button>
        </form>

        <p className="mt-4 text-sm text-zinc-500" data-testid="catalog-count">
          {t("found", { count: total })}
        </p>

        <div className="mt-4 grid gap-4">
          {cards.map((card) => (
            <TeacherCard
              key={card.user_id}
              card={card}
              locale={locale}
              t={{
                from: t("from"),
                perHour: t("perHour"),
                freeTrial: t("freeTrialBadge"),
                lessons: t("lessonsShort"),
              }}
            />
          ))}
          {cards.length === 0 && (
            <p className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500">
              {t("empty")}
            </p>
          )}
        </div>

        {totalPages > 1 && (
          <nav className="mt-8 flex justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
              const q = new URLSearchParams(
                Object.entries({ ...sp, page: String(p) }).filter(([, v]) => v),
              );
              return (
                <a
                  key={p}
                  href={`?${q.toString()}`}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    p === page ? "bg-teal-700 text-white" : "border border-zinc-300"
                  }`}
                >
                  {p}
                </a>
              );
            })}
          </nav>
        )}
      </main>
    </>
  );
}
