import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { fetchTeacherBySlug } from "@/lib/catalog";
import { LocaleSwitcher } from "@/components/locale-switcher";

// ISR: profile pages are the SEO core (docs/02) — rebuild at most every 60s
export const revalidate = 60;
export const dynamicParams = true;
export function generateStaticParams() {
  return []; // rendered on demand, then cached
}

const SITE = process.env.APP_BASE_URL ?? "https://ustoz.uz";
const fmt = (tiyin: number) => Math.round(tiyin / 100).toLocaleString("ru-RU");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const teacher = await fetchTeacherBySlug(slug);
  if (!teacher) return {};
  const name = teacher.profiles?.full_name ?? "";
  const headline = locale === "ru" ? teacher.headline_ru : teacher.headline_uz;
  const bio = locale === "ru" ? teacher.bio_ru : teacher.bio_uz;
  const title = `${name} — ${headline}`;
  return {
    title,
    description: bio.slice(0, 160),
    alternates: {
      canonical: `${SITE}${locale === "uz" ? "" : "/ru"}/t/${slug}`,
      languages: {
        uz: `${SITE}/t/${slug}`,
        ru: `${SITE}/ru/t/${slug}`,
      },
    },
    openGraph: {
      title,
      description: bio.slice(0, 160),
      type: "profile",
      ...(teacher.profiles?.avatar_url
        ? { images: [{ url: teacher.profiles.avatar_url }] }
        : {}),
    },
  };
}

export default async function TeacherPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Teacher" });

  const teacher = await fetchTeacherBySlug(slug);
  if (!teacher) notFound();

  const name = teacher.profiles?.full_name ?? "";
  const headline = locale === "ru" ? teacher.headline_ru : teacher.headline_uz;
  const bio = locale === "ru" ? teacher.bio_ru : teacher.bio_uz;
  const activeSubjects = teacher.teacher_subjects.filter((s) => s.is_active);
  const minPrice = Math.min(...activeSubjects.map((s) => s.price_60));
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // schema.org Person + Offers (docs/02: the SEO asset)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    description: headline,
    url: `${SITE}${locale === "uz" ? "" : "/ru"}/t/${slug}`,
    ...(teacher.profiles?.avatar_url ? { image: teacher.profiles.avatar_url } : {}),
    jobTitle: headline,
    knowsLanguage: teacher.teaching_langs,
    ...(teacher.rating_count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(teacher.rating_avg).toFixed(2),
            reviewCount: teacher.rating_count,
            bestRating: 5,
          },
        }
      : {}),
    makesOffer: activeSubjects.map((s) => ({
      "@type": "Offer",
      name: locale === "ru" ? s.subjects?.name_ru : s.subjects?.name_uz,
      price: Math.round(s.price_60 / 100),
      priceCurrency: "UZS",
      description: "60 min online lesson",
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="border-b border-zinc-100">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-extrabold tracking-wide text-teal-700">
            USTOZ
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/catalog" className="text-sm text-zinc-600 hover:text-zinc-900">
              {t("backToCatalog")}
            </Link>
            <LocaleSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <div className="flex flex-col gap-6 sm:flex-row">
          {teacher.profiles?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={teacher.profiles.avatar_url}
              alt={name}
              className="h-28 w-28 rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-teal-100 text-3xl font-bold text-teal-800">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{name}</h1>
              {teacher.tier === "pro" && (
                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold uppercase text-amber-700">
                  PRO
                </span>
              )}
              {teacher.is_verified && <span className="text-teal-600">✓</span>}
            </div>
            <p className="mt-1 text-zinc-600">{headline}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-600">
              <span className="text-amber-600">
                ★ {Number(teacher.rating_avg).toFixed(1)}{" "}
                <span className="text-zinc-400">({teacher.rating_count} {t("reviews")})</span>
              </span>
              <span>{teacher.lessons_done} {t("lessonsDone")}</span>
              <span>{t("experience", { years: teacher.experience_years })}</span>
              <span>{t("speaks")}: {teacher.teaching_langs.join(", ").toUpperCase()}</span>
            </div>
          </div>
          <div className="shrink-0 rounded-2xl bg-zinc-50 p-4 text-center">
            <div className="text-xs text-zinc-500">{t("from")}</div>
            <div className="text-xl font-bold">{fmt(minPrice)} UZS</div>
            <div className="text-xs text-zinc-500">{t("per60")}</div>
            <span className="mt-3 block cursor-not-allowed rounded-xl bg-teal-700 px-5 py-2 text-sm font-semibold text-white opacity-60">
              {t("book")}
            </span>
            <span className="mt-1 block text-[10px] text-zinc-400">{t("bookingSoon")}</span>
          </div>
        </div>

        {teacher.intro_video_url && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold">{t("video")}</h2>
            <video
              src={teacher.intro_video_url}
              controls
              className="mt-3 aspect-video w-full max-w-xl rounded-2xl bg-black"
            />
          </section>
        )}

        <section className="mt-8">
          <h2 className="text-lg font-semibold">{t("about")}</h2>
          <p className="mt-2 whitespace-pre-line leading-relaxed text-zinc-700">{bio}</p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">{t("subjectsPrices")}</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">{t("subject")}</th>
                  <th className="px-4 py-2.5 font-medium">30 {t("min")}</th>
                  <th className="px-4 py-2.5 font-medium">60 {t("min")}</th>
                  <th className="px-4 py-2.5 font-medium">90 {t("min")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("trial")}</th>
                </tr>
              </thead>
              <tbody>
                {activeSubjects.map((s) => (
                  <tr key={s.id} className="border-t border-zinc-100">
                    <td className="px-4 py-3 font-medium">
                      {locale === "ru" ? s.subjects?.name_ru : s.subjects?.name_uz}
                    </td>
                    <td className="px-4 py-3">{s.price_30 ? `${fmt(s.price_30)} UZS` : "—"}</td>
                    <td className="px-4 py-3 font-semibold">{fmt(s.price_60)} UZS</td>
                    <td className="px-4 py-3">{s.price_90 ? `${fmt(s.price_90)} UZS` : "—"}</td>
                    <td className="px-4 py-3">
                      {s.trial_free_enabled
                        ? t("trialFree")
                        : s.trial_discount_pct > 0
                          ? `−${s.trial_discount_pct}%`
                          : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
