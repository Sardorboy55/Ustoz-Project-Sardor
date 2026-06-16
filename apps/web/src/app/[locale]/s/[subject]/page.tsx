import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  fetchCatalog,
  fetchSubjectBySlug,
  fetchSubjects,
  type CatalogCard,
} from "@/lib/catalog";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { FilterChip } from "@/components/ui/chip";
import { FavoritesProvider } from "@/components/favorites";
import { TeacherCard } from "@/components/teacher-card";
import { localizeContent } from "@/lib/content-i18n";

// SEO landing «репетитор {предмет}» (docs/04 §4.8)
export const revalidate = 300;

const SITE = process.env.APP_BASE_URL ?? "https://ustoz.uz";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; subject: string }>;
}): Promise<Metadata> {
  const { locale, subject: slug } = await params;
  const subject = await fetchSubjectBySlug(slug);
  if (!subject) return {};
  const t = await getTranslations({ locale, namespace: "SubjectPage" });
  const name = localizeContent(locale, subject.name_uz, subject.name_ru);
  // 'en' is a real locale — prefix every non-default locale so /en doesn't
  // declare a /ru canonical.
  const prefix = locale === "uz" ? "" : `/${locale}`;
  return {
    title: t("metaTitle", { subject: name }),
    description: t("metaDescription", { subject: name }),
    alternates: {
      canonical: `${SITE}${prefix}/s/${slug}`,
      languages: {
        uz: `${SITE}/s/${slug}`,
        ru: `${SITE}/ru/s/${slug}`,
        en: `${SITE}/en/s/${slug}`,
      },
    },
  };
}

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ locale: string; subject: string }>;
}) {
  const { locale, subject: slug } = await params;
  setRequestLocale(locale);
  const subject = await fetchSubjectBySlug(slug);
  if (!subject) notFound();

  const t = await getTranslations({ locale, namespace: "SubjectPage" });
  const tc = await getTranslations({ locale, namespace: "Catalog" });
  const name = localizeContent(locale, subject.name_uz, subject.name_ru);

  let cards: CatalogCard[] = [];
  let failed = false;
  try {
    cards = await fetchCatalog({ subjectId: subject.id, perPage: 30 });
  } catch {
    failed = true;
  }

  /** Sibling subjects from the same category — internal SEO links. */
  let neighbors: Awaited<ReturnType<typeof fetchSubjects>> = [];
  try {
    neighbors = (await fetchSubjects(subject.category_id))
      .filter((s) => s.slug !== subject.slug)
      .slice(0, 10);
  } catch {
    /* graceful: block just hides */
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <Link
        href="/catalog"
        className="inline-flex items-center gap-1 text-sm text-zinc-600 transition-colors hover:text-zinc-900"
      >
        <ChevronLeft size={16} aria-hidden="true" />
        {t("allTeachers")}
      </Link>

      <h1 className="mt-5 text-3xl font-bold tracking-tight">{t("h1", { subject: name })}</h1>
      <p className="mt-2 max-w-2xl text-zinc-600">{t("intro", { subject: name })}</p>
      {!failed && cards.length > 0 && (
        <p className="mt-3 text-sm text-zinc-500">
          {t("found", { count: cards[0]?.total_count ?? cards.length })}
        </p>
      )}

      <div className="mt-8">
        {failed ? (
          <ErrorState retryHref={`/s/${slug}`} />
        ) : cards.length === 0 ? (
          <EmptyState
            title={tc("emptyTitle")}
            description={tc("emptyDescription")}
            action={
              <ButtonLink href="/catalog" variant="secondary">
                {t("allTeachers")}
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

      {/* SEO text block */}
      <section className="mt-12 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
        <h2 className="text-xl font-bold text-zinc-900">{t("seoTitle", { subject: name })}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-600">
          {t("seoP1", { subject: name })}
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-600">
          {t("seoP2", { subject: name })}
        </p>
      </section>

      {/* Sibling subjects of the same category */}
      {neighbors.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-zinc-900">{t("neighborsTitle")}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {neighbors.map((s) => (
              <FilterChip key={s.id} href={`/s/${s.slug}`}>
                {localizeContent(locale, s.name_uz, s.name_ru)}
              </FilterChip>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
