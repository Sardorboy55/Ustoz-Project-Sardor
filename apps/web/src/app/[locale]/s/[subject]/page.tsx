import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { fetchCatalog, fetchSubjectBySlug } from "@/lib/catalog";
import { TeacherCard } from "@/components/teacher-card";
import { LocaleSwitcher } from "@/components/locale-switcher";

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
  const name = locale === "ru" ? subject.name_ru : subject.name_uz;
  return {
    title: t("metaTitle", { subject: name }),
    description: t("metaDescription", { subject: name }),
    alternates: {
      canonical: `${SITE}${locale === "uz" ? "" : "/ru"}/s/${slug}`,
      languages: { uz: `${SITE}/s/${slug}`, ru: `${SITE}/ru/s/${slug}` },
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
  const name = locale === "ru" ? subject.name_ru : subject.name_uz;

  const cards = await fetchCatalog({ subjectId: subject.id, perPage: 30 });

  return (
    <>
      <header className="border-b border-zinc-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-extrabold tracking-wide text-teal-700">
            USTOZ
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/catalog" className="text-sm text-zinc-600 hover:text-zinc-900">
              {t("allTeachers")}
            </Link>
            <LocaleSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <h1 className="text-3xl font-bold">{t("h1", { subject: name })}</h1>
        <p className="mt-2 max-w-2xl text-zinc-600">{t("intro", { subject: name })}</p>

        <div className="mt-8 grid gap-4">
          {cards.map((card) => (
            <TeacherCard
              key={card.user_id}
              card={card}
              locale={locale}
              t={{
                from: tc("from"),
                perHour: tc("perHour"),
                freeTrial: tc("freeTrialBadge"),
                lessons: tc("lessonsShort"),
              }}
            />
          ))}
          {cards.length === 0 && (
            <p className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500">
              {tc("empty")}
            </p>
          )}
        </div>
      </main>
    </>
  );
}
