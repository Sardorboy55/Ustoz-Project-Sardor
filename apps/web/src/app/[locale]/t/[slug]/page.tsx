import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BookOpen,
  CalendarClock,
  ChevronLeft,
  GraduationCap,
  Languages,
  Star,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  fetchSimilarTeachers,
  fetchTeacherBySlug,
  fetchTeacherReviews,
  type CatalogCard,
  type TeacherReview,
} from "@/lib/catalog";
import { formatDateWithYear } from "@/lib/datetime";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Price } from "@/components/ui/price";
import { RatingStars } from "@/components/ui/rating-stars";
import { SectionHeading } from "@/components/ui/section-heading";
import { FaqItem } from "@/components/faq";
import { FavoritesProvider } from "@/components/favorites";
import { TeacherCard } from "@/components/teacher-card";
import { BookingProvider } from "@/components/booking/booking-context";
import { BookingWidget, type BookingSubject } from "@/components/booking/booking-widget";
import { SelectSubjectButton } from "@/components/booking/select-subject-button";
import { ContactTeacherButton } from "@/components/teacher/contact-button";

// ISR: profile pages are the SEO core (docs/02) — rebuild at most every 60s
export const revalidate = 60;
export const dynamicParams = true;
export function generateStaticParams() {
  return []; // rendered on demand, then cached
}

const SITE = process.env.APP_BASE_URL ?? "https://ustoz.uz";

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
  const description = (bio || headline).slice(0, 160);
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE}${locale === "uz" ? "" : "/ru"}/t/${slug}`,
      languages: {
        uz: `${SITE}/t/${slug}`,
        ru: `${SITE}/ru/t/${slug}`,
      },
    },
    openGraph: {
      title,
      description,
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
  const tCard = await getTranslations({ locale, namespace: "TeacherCard" });

  const teacher = await fetchTeacherBySlug(slug);
  if (!teacher) notFound();

  const name = teacher.profiles?.full_name ?? "";
  const headline = locale === "ru" ? teacher.headline_ru : teacher.headline_uz;
  const bio = locale === "ru" ? teacher.bio_ru : teacher.bio_uz;
  const activeSubjects = teacher.teacher_subjects.filter((s) => s.is_active);
  const minPrice =
    activeSubjects.length > 0
      ? Math.min(...activeSubjects.map((s) => s.price_60))
      : null;
  const hasFreeTrial = activeSubjects.some((s) => s.trial_free_enabled);
  const subjectName = (s: { name_uz: string; name_ru: string } | null) =>
    s ? (locale === "ru" ? s.name_ru : s.name_uz) : "";
  const langLabel = (code: string) =>
    tCard.has(`langs.${code}`) ? tCard(`langs.${code}`) : code.toUpperCase();

  // Graceful degraded sections: the page must render even if these fail.
  let reviews: TeacherReview[] = [];
  let reviewsFailed = false;
  try {
    reviews = await fetchTeacherReviews(teacher.user_id, 10);
  } catch {
    reviewsFailed = true;
  }

  let similar: CatalogCard[] = [];
  const firstSubjectId = activeSubjects[0]?.subjects?.id;
  try {
    if (firstSubjectId) {
      similar = await fetchSimilarTeachers(firstSubjectId, teacher.user_id, 3);
    }
  } catch {
    /* section hides itself */
  }

  const widgetSubjects: BookingSubject[] = activeSubjects.map((s) => ({
    id: s.id,
    nameUz: s.subjects?.name_uz ?? "",
    nameRu: s.subjects?.name_ru ?? "",
    price30: s.price_30,
    price60: s.price_60,
    price90: s.price_90,
    trialFree: s.trial_free_enabled,
  }));

  const anonymousName = locale === "ru" ? "Ученик" : "O'quvchi";

  // schema.org Person + Offers + reviews (docs/02: the SEO asset)
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
    ...(reviews.length > 0
      ? {
          review: reviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            reviewRating: {
              "@type": "Rating",
              ratingValue: r.stars,
              bestRating: 5,
            },
            author: { "@type": "Person", name: anonymousName },
            datePublished: r.created_at.slice(0, 10),
            ...(r.body ? { reviewBody: r.body } : {}),
          })),
        }
      : {}),
    makesOffer: activeSubjects.map((s) => ({
      "@type": "Offer",
      name: subjectName(s.subjects),
      price: Math.round(s.price_60 / 100),
      priceCurrency: "UZS",
      description: "60 min online lesson",
    })),
  };

  const packages = (s: (typeof activeSubjects)[number]) =>
    (
      [
        [5, s.pkg5_discount_pct],
        [10, s.pkg10_discount_pct],
        [20, s.pkg20_discount_pct],
      ] as const
    ).filter(([, pct]) => pct > 0);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Link
          href="/catalog"
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          {t("backToCatalog")}
        </Link>

        <BookingProvider
          initialSubjectId={
            activeSubjects.length === 1 ? activeSubjects[0].id : null
          }
        >
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* ===================== Hero ===================== */}
            <section className="lg:col-start-1 lg:row-start-1">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <Avatar
                  src={teacher.profiles?.avatar_url}
                  name={name}
                  size="xl"
                  className="rounded-2xl"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                      {name}
                    </h1>
                    {teacher.is_verified && <Badge variant="verified" />}
                    {teacher.tier === "pro" && <Badge variant="pro" />}
                  </div>
                  {headline && (
                    <p className="mt-1.5 text-zinc-600">{headline}</p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-600">
                    <a
                      href="#reviews"
                      className="rounded-lg outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-brand-600"
                    >
                      <RatingStars
                        value={Number(teacher.rating_avg)}
                        count={teacher.rating_count}
                        size={15}
                      />
                    </a>
                    <span className="inline-flex items-center gap-1.5">
                      <BookOpen size={15} className="text-zinc-400" aria-hidden="true" />
                      {tCard("lessons", { count: teacher.lessons_done })}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <GraduationCap size={15} className="text-zinc-400" aria-hidden="true" />
                      {t("experienceYears", { years: teacher.experience_years })}
                    </span>
                  </div>
                  {teacher.teaching_langs.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <Languages size={15} className="text-zinc-400" aria-hidden="true" />
                      {teacher.teaching_langs.map((code) => (
                        <span
                          key={code}
                          className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600"
                        >
                          {langLabel(code)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ===================== Sticky booking card ===================== */}
            <aside className="lg:col-start-2 lg:row-start-1 lg:row-span-2">
              <Card className="overflow-hidden lg:sticky lg:top-24">
                {teacher.profiles?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL
                  <img
                    src={teacher.profiles.avatar_url}
                    alt={name}
                    className="h-44 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-44 w-full items-center justify-center bg-brand-50 text-5xl font-bold text-brand-300">
                    {name
                      .trim()
                      .split(/\s+/)
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                )}
                <div className="space-y-3 p-5">
                  {minPrice !== null && (
                    <Price
                      tiyin={minPrice}
                      from
                      suffix={t("per60Short")}
                      className="block text-xl"
                    />
                  )}
                  <RatingStars
                    value={Number(teacher.rating_avg)}
                    count={teacher.rating_count}
                    size={14}
                  />
                  {hasFreeTrial && (
                    <Badge variant="trial">{t("freeTrial20")}</Badge>
                  )}
                  {activeSubjects.length > 0 && (
                    <a
                      href="#booking"
                      className={buttonClasses("primary", "lg", "w-full")}
                    >
                      <CalendarClock size={18} aria-hidden="true" />
                      {t("book")}
                    </a>
                  )}
                  <ContactTeacherButton
                    teacherId={teacher.user_id}
                    teacherSlug={teacher.slug}
                  />
                  <p className="text-xs leading-relaxed text-zinc-500">
                    {t("cancelNote")}
                  </p>
                </div>
              </Card>
            </aside>

            {/* ===================== Main content ===================== */}
            <div className="space-y-12 lg:col-start-1 lg:row-start-2">
              {teacher.intro_video_url && (
                <section>
                  <SectionHeading title={t("video")} />
                  <video
                    src={teacher.intro_video_url}
                    controls
                    preload="metadata"
                    {...(teacher.profiles?.avatar_url
                      ? { poster: teacher.profiles.avatar_url }
                      : {})}
                    className="mt-4 aspect-video w-full max-w-2xl rounded-2xl bg-zinc-900"
                  />
                </section>
              )}

              {bio && (
                <section>
                  <SectionHeading title={t("about")} />
                  <p className="mt-4 max-w-prose whitespace-pre-line leading-relaxed text-zinc-700">
                    {bio}
                  </p>
                  <p className="mt-3 text-sm text-zinc-500">
                    {t("experienceYears", { years: teacher.experience_years })} ·{" "}
                    {t("speaks")}:{" "}
                    {teacher.teaching_langs.map(langLabel).join(", ")}
                  </p>
                </section>
              )}

              {activeSubjects.length > 0 && (
                <section>
                  <SectionHeading title={t("services")} />
                  <div className="mt-4 grid gap-4">
                    {activeSubjects.map((s) => (
                      <Card key={s.id} className="p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="text-base font-bold text-zinc-900">
                            {subjectName(s.subjects)}
                          </h3>
                          <SelectSubjectButton subjectId={s.id}>
                            {t("choose")}
                          </SelectSubjectButton>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(
                            [
                              [30, s.price_30],
                              [60, s.price_60],
                              [90, s.price_90],
                            ] as const
                          )
                            .filter(([, price]) => price != null)
                            .map(([min, price]) => (
                              <span
                                key={min}
                                className="inline-flex items-baseline gap-1.5 rounded-xl bg-zinc-50 px-3 py-2 text-sm"
                              >
                                <span className="text-zinc-500">
                                  {min} {t("min")}
                                </span>
                                <Price tiyin={price!} />
                              </span>
                            ))}
                        </div>
                        {(s.trial_free_enabled ||
                          s.trial_discount_pct > 0 ||
                          packages(s).length > 0) && (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {s.trial_free_enabled ? (
                              <Badge variant="trial">{t("trialFree")}</Badge>
                            ) : s.trial_discount_pct > 0 ? (
                              <Badge variant="trial">
                                {t("trialDiscount", {
                                  pct: s.trial_discount_pct,
                                })}
                              </Badge>
                            ) : null}
                            {packages(s).length > 0 && (
                              <>
                                <span className="text-xs font-medium text-zinc-500">
                                  {t("packages")}:
                                </span>
                                {packages(s).map(([count, pct]) => (
                                  <span
                                    key={count}
                                    className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700"
                                  >
                                    {t("pkgLessons", { count })} −{pct}%
                                  </span>
                                ))}
                              </>
                            )}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {activeSubjects.length > 0 && (
                <section id="booking" className="scroll-mt-24">
                  <SectionHeading
                    title={t("scheduleTitle")}
                    subtitle={t("scheduleSubtitle")}
                  />
                  <div className="mt-4">
                    <BookingWidget
                      teacherId={teacher.user_id}
                      teacherSlug={teacher.slug}
                      teacherName={name}
                      subjects={widgetSubjects}
                    />
                  </div>
                </section>
              )}

              <section id="reviews" className="scroll-mt-24">
                <SectionHeading title={t("reviewsTitle")} />
                {reviewsFailed ? (
                  <ErrorState
                    description={t("reviewsError")}
                    retryHref={`/t/${slug}`}
                    className="mt-4"
                  />
                ) : reviews.length === 0 ? (
                  <EmptyState
                    icon={Star}
                    title={t("noReviewsTitle")}
                    description={t("noReviewsBody")}
                    className="mt-4"
                  />
                ) : (
                  <div className="mt-4 space-y-5">
                    <div className="flex items-center gap-4 rounded-2xl bg-brand-50 p-5">
                      <span className="text-4xl font-extrabold text-brand-700">
                        {Number(teacher.rating_avg).toFixed(1)}
                      </span>
                      <div>
                        <RatingStars
                          value={Number(teacher.rating_avg)}
                          size={16}
                          showValue={false}
                        />
                        <p className="mt-1 text-sm text-zinc-600">
                          {t("reviewsBasedOn", { count: teacher.rating_count })}
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-4">
                      {reviews.map((r) => (
                        <li key={r.booking_id}>
                          <Card className="p-5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="flex items-center gap-2.5">
                                <Avatar name={anonymousName} size="sm" />
                                <span className="text-sm font-semibold text-zinc-900">
                                  {t("anonymousStudent")}
                                </span>
                              </span>
                              <span className="text-xs text-zinc-400">
                                {formatDateWithYear(
                                  new Date(r.created_at),
                                  locale,
                                )}
                              </span>
                            </div>
                            <RatingStars
                              value={r.stars}
                              size={13}
                              showValue={false}
                              className="mt-2.5"
                            />
                            {r.body && (
                              <p className="mt-2 text-sm leading-relaxed text-zinc-700">
                                {r.body}
                              </p>
                            )}
                          </Card>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-zinc-400">
                      {t("reviewsPrivacy")}
                    </p>
                  </div>
                )}
              </section>

              <section>
                <SectionHeading title={t("faqTitle")} />
                <div className="mt-4 space-y-3">
                  <FaqItem question={t("faqLessonQ")} answer={t("faqLessonA")} />
                  <FaqItem question={t("faqCancelQ")} answer={t("faqCancelA")} />
                  <FaqItem
                    question={t("faqPrepareQ")}
                    answer={t("faqPrepareA")}
                  />
                </div>
              </section>
            </div>
          </div>
        </BookingProvider>

        {similar.length > 0 && (
          <section className="mt-14">
            <SectionHeading
              title={t("similarTitle")}
              action={
                <Link
                  href="/catalog"
                  className="text-sm font-semibold text-brand-700 hover:text-brand-800"
                >
                  {t("allTeachers")}
                </Link>
              }
            />
            <FavoritesProvider>
              <div className="mt-4 grid gap-4">
                {similar.map((card) => (
                  <TeacherCard key={card.user_id} card={card} />
                ))}
              </div>
            </FavoritesProvider>
          </section>
        )}
      </main>
    </>
  );
}
