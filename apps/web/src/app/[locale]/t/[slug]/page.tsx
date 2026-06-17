import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BookOpen,
  ChevronLeft,
  GraduationCap,
  Languages,
  Star,
  ArrowRight,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  fetchSimilarTeachers,
  fetchTeacherBySlug,
  fetchAvailabilityDays,
  fetchTeacherFaq,
  fetchTeacherReviews,
  type CatalogCard,
  type TeacherReview,
} from "@/lib/catalog";
import { formatDateWithYear } from "@/lib/datetime";
import { Avatar } from "@/components/ui/avatar";
import { TeacherMedia } from "@/components/teacher-media";
import { localizeContent } from "@/lib/content-i18n";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Price } from "@/components/ui/price";
import { RatingStars } from "@/components/ui/rating-stars";
import { SectionHeading } from "@/components/ui/section-heading";
import { FaqItem } from "@/components/faq";
import { FavoritesProvider } from "@/components/favorites";
import { TeacherCard } from "@/components/teacher-card";
import { BookingProvider } from "@/components/booking/booking-context";
import { type BookingSubject } from "@/components/booking/booking-widget";
import { BookNowButton } from "@/components/booking/book-now-button";
import { BookingModal } from "@/components/booking/booking-modal";
import { SelectSubjectButton } from "@/components/booking/select-subject-button";
import { PackagePicker } from "@/components/booking/package-picker";
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
  // 'en' is a real locale (i18n/routing.ts) — prefix every non-default locale,
  // not just 'ru', so /en pages don't declare a /ru canonical.
  const prefix = locale === "uz" ? "" : `/${locale}`;
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE}${prefix}/t/${slug}`,
      languages: {
        uz: `${SITE}/t/${slug}`,
        ru: `${SITE}/ru/t/${slug}`,
        en: `${SITE}/en/t/${slug}`,
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
  const firstSubjectId = activeSubjects[0]?.subjects?.id;

  // These three only depend on the already-resolved teacher, so fetch them in
  // parallel instead of serializing 3 round-trips on this SEO-critical page.
  // Availability stays uncaught (same as before — its failure errors the page);
  // reviews and similar degrade gracefully and must never break the render.
  const [availDays, reviewsResult, similar, teacherFaq] = await Promise.all([
    fetchAvailabilityDays(teacher.user_id),
    fetchTeacherReviews(teacher.user_id, 10)
      .then((r) => ({ ok: true as const, reviews: r }))
      .catch(() => ({ ok: false as const, reviews: [] as TeacherReview[] })),
    firstSubjectId
      ? fetchSimilarTeachers(firstSubjectId, teacher.user_id, 3).catch(
          () => [] as CatalogCard[],
        )
      : Promise.resolve([] as CatalogCard[]),
    fetchTeacherFaq(teacher.user_id).catch(() => []),
  ]);
  const reviews = reviewsResult.reviews;
  const reviewsFailed = !reviewsResult.ok;

  // Tashkent weekday — intentionally request-time (server component, ISR 60s).
  // eslint-disable-next-line react-hooks/purity
  const tashDow = new Date(Date.now() + 5 * 3600 * 1000).getUTCDay();
  const availableToday =
    availDays.includes(tashDow) || (tashDow === 0 && availDays.includes(7));
  const slotStatus =
    availDays.length === 0 ? "closed" : availableToday ? "today" : "scheduled";
  const minPrice =
    activeSubjects.length > 0
      ? Math.min(...activeSubjects.map((s) => s.price_60))
      : null;
  const hasFreeTrial = activeSubjects.some((s) => s.trial_free_enabled);
  const subjectName = (s: { name_uz: string; name_ru: string } | null) =>
    s ? localizeContent(locale, s.name_uz, s.name_ru) : "";
  const langLabel = (code: string) =>
    tCard.has(`langs.${code}`) ? tCard(`langs.${code}`) : code.toUpperCase();

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
    url: `${SITE}${locale === "uz" ? "" : `/${locale}`}/t/${slug}`,
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
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 pb-32 sm:px-6">
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
          <div className="space-y-10">
            {/* ===================== Hero ===================== */}
            <section>
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
                  <div className="mt-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                        slotStatus === "today"
                          ? "bg-emerald-50 text-emerald-700"
                          : slotStatus === "scheduled"
                            ? "bg-brand-50 text-brand-700"
                            : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          slotStatus === "closed"
                            ? "bg-zinc-400"
                            : "bg-emerald-500"
                        }`}
                      />
                      {slotStatus === "today"
                        ? t("statusToday")
                        : slotStatus === "scheduled"
                          ? t("statusScheduled")
                          : t("statusClosed")}
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

            {/* ===================== Main content ===================== */}
            <div className="space-y-12">
              {teacher.intro_video_url && (
                <section>
                  <SectionHeading align="left" title={t("video")} />
                  <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200">
                    <TeacherMedia
                      name={name}
                      videoUrl={teacher.intro_video_url}
                      posterUrl={
                        teacher.intro_video_poster_url ??
                        teacher.profiles?.avatar_url
                      }
                      playLabel={tCard("playVideo")}
                      rounded="rounded-2xl"
                      playCentered
                    />
                  </div>
                </section>
              )}
              {bio && (
                <section>
                  <SectionHeading align="left" title={t("about")} />
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
                  <SectionHeading align="left" title={t("services")} />
                  <div className="mt-4 grid gap-4">
                    {activeSubjects.map((s) => (
                      <Card key={s.id} className="flex flex-col p-5">
                        <h3 className="text-base font-bold text-zinc-900">
                          {subjectName(s.subjects)}
                        </h3>
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
                        <SelectSubjectButton
                          subjectId={s.id}
                          className="mt-4 w-full"
                        >
                          {t("choose")}
                        </SelectSubjectButton>
                        <PackagePicker
                          teacherSubjectId={s.id}
                          subjectName={subjectName(s.subjects)}
                          prices={{
                            30: s.price_30,
                            60: s.price_60,
                            90: s.price_90,
                          }}
                          discounts={{
                            5: s.pkg5_discount_pct,
                            10: s.pkg10_discount_pct,
                            20: s.pkg20_discount_pct,
                          }}
                        />
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              <section id="reviews" className="scroll-mt-24">
                <SectionHeading align="left" title={t("reviewsTitle")} />
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
                      <Link
                        href={`/t/${slug}/reviews`}
                        className="ml-auto inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-brand-700 transition-colors hover:text-brand-800"
                      >
                        {t("allReviews")}
                        <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    </div>
                    <ul id="reviews-list" className="space-y-4">
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
                <SectionHeading align="left" title={t("faqTitle")} />
                <div className="mt-4 space-y-3">
                  {/* The teacher's own questions only. The general platform
                      questions appear solely as a fallback when the teacher
                      hasn't added any of their own. */}
                  {teacherFaq.length > 0 ? (
                    teacherFaq.map((f, i) => (
                      <FaqItem key={`t-${i}`} question={f.q} answer={f.a} />
                    ))
                  ) : (
                    <>
                      <FaqItem question={t("faqLessonQ")} answer={t("faqLessonA")} />
                      <FaqItem question={t("faqCancelQ")} answer={t("faqCancelA")} />
                      <FaqItem
                        question={t("faqPrepareQ")}
                        answer={t("faqPrepareA")}
                      />
                    </>
                  )}
                </div>
              </section>
            </div>
          </div>

          <BookingModal
            teacherId={teacher.user_id}
            teacherSlug={teacher.slug}
            teacherName={name}
            subjects={widgetSubjects}
          />

          {/* ===================== Floating action bar ===================== */}
          <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-3 sm:bottom-6 sm:px-4">
            <div className="pointer-events-auto flex w-full max-w-2xl flex-col gap-2 rounded-2xl border border-zinc-200 bg-white/95 px-3 py-2.5 shadow-xl ring-1 ring-black/5 backdrop-blur sm:flex-row sm:items-center sm:gap-3 sm:px-4">
              {/* Price — its own row on mobile so it's always fully visible */}
              <div className="min-w-0 sm:flex-1">
                {minPrice !== null && (
                  <Price
                    tiyin={minPrice}
                    from
                    suffix={t("per60Short")}
                    className="block text-base font-extrabold leading-tight text-zinc-900 sm:text-lg"
                  />
                )}
                {hasFreeTrial && (
                  <span className="block truncate text-xs font-medium text-brand-700">
                    {t("freeTrial20")}
                  </span>
                )}
              </div>
              {/* Actions — equal-width, text-only (no icons) on mobile */}
              <div className="flex items-center gap-2 sm:shrink-0">
                <ContactTeacherButton
                  teacherId={teacher.user_id}
                  teacherSlug={teacher.slug}
                  size="lg"
                  icon={false}
                  className="flex-1 sm:flex-none"
                />
                {activeSubjects.length > 0 && (
                  <BookNowButton className="flex-1 whitespace-nowrap sm:flex-none">
                    <span className="sm:hidden">{t("bookShort")}</span>
                    <span className="hidden sm:inline">{t("book")}</span>
                  </BookNowButton>
                )}
              </div>
            </div>
          </div>
        </BookingProvider>

        {similar.length > 0 && (
          <section className="mt-14">
            <SectionHeading
              align="left"
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
