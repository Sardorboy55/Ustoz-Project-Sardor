import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, Star } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  fetchTeacherBySlug,
  fetchTeacherReviews,
  type TeacherReview,
} from "@/lib/catalog";
import { formatDateWithYear } from "@/lib/datetime";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { RatingStars } from "@/components/ui/rating-stars";

// Mirrors the profile page's ISR settings (docs/02).
export const revalidate = 60;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
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
  const t = await getTranslations({ locale, namespace: "Teacher" });
  return {
    title: `${t("reviewsTitle")} — ${name}`,
    alternates: {
      canonical: `${SITE}${locale === "uz" ? "" : "/ru"}/t/${slug}/reviews`,
    },
  };
}

export default async function TeacherReviewsPage({
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
  const anonymousName = t("anonymousStudent");

  let reviews: TeacherReview[] = [];
  let reviewsFailed = false;
  try {
    reviews = await fetchTeacherReviews(teacher.user_id, 200);
  } catch {
    reviewsFailed = true;
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <Link
        href={`/t/${slug}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition-colors hover:text-brand-700"
      >
        <ChevronLeft size={16} aria-hidden="true" />
        {t("backToProfile")}
      </Link>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900">
        {t("reviewsTitle")} · {name}
      </h1>

      {teacher.rating_count > 0 && (
        <div className="mt-4 flex items-center gap-4 rounded-2xl bg-brand-50 p-5">
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
      )}

      {reviewsFailed ? (
        <ErrorState
          description={t("reviewsError")}
          retryHref={`/t/${slug}/reviews`}
          className="mt-6"
        />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title={t("noReviewsTitle")}
          description={t("noReviewsBody")}
          className="mt-6"
        />
      ) : (
        <>
          <ul className="mt-6 space-y-4">
            {reviews.map((r) => (
              <li key={r.booking_id}>
                <Card className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={anonymousName} size="sm" />
                      <span className="text-sm font-semibold text-zinc-900">
                        {anonymousName}
                      </span>
                    </span>
                    <span className="text-xs text-zinc-400">
                      {formatDateWithYear(new Date(r.created_at), locale)}
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
          <p className="mt-4 text-xs text-zinc-400">{t("reviewsPrivacy")}</p>
        </>
      )}
    </main>
  );
}
