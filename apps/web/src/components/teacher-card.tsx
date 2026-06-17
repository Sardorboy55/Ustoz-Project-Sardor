import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CatalogCard } from "@/lib/catalog";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { RatingStars } from "@/components/ui/rating-stars";
import { buttonClasses } from "@/components/ui/button";
import { FavoriteButton } from "@/components/favorites";
import { TeacherMedia } from "@/components/teacher-media";
import { localizeList } from "@/lib/content-i18n";
import { cn } from "@/lib/cn";

/**
 * Wide marketplace teacher card (catalog). The whole card is a stretched link
 * to /t/[slug]. PRO teachers get a premium look (brand tint, ring, PRO ribbon,
 * filled CTA) so they stand out. Render inside a FavoritesProvider.
 */
export function TeacherCard({
  card,
  bio,
  videoUrl,
}: {
  card: CatalogCard;
  bio?: { uz: string; ru: string };
  /** When provided (catalog), the photo slot becomes an italki-style media box
   *  (poster + play → inline intro video). `null` = media box with poster only.
   *  Omit entirely (other usages) to keep the compact round avatar. */
  videoUrl?: string | null;
}) {
  const locale = useLocale();
  const t = useTranslations("TeacherCard");
  const isPro = card.tier === "pro";

  const headline = locale === "ru" ? card.headline_ru : card.headline_uz;
  const bioText = bio ? (locale === "ru" ? bio.ru : bio.uz) : "";
  const subjects = localizeList(locale, card.subjects_uz, card.subjects_ru);
  const langLabel = (code: string) =>
    t.has(`langs.${code}`) ? t(`langs.${code}`) : code.toUpperCase();

  return (
    <article
      data-testid="teacher-card"
      className={cn(
        "group relative flex flex-col gap-5 rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:flex-row sm:gap-6 sm:p-6",
        isPro
          ? "border-brand-300 bg-gradient-to-r from-brand-50/70 to-white ring-1 ring-brand-100"
          : "border-zinc-200 bg-white hover:border-brand-300",
      )}
    >
      {/* PRO ribbon */}
      {isPro && (
        <span className="absolute -top-2.5 left-6 z-[2] rounded-full bg-gradient-to-r from-brand-500 to-brand-700 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">
          PRO
        </span>
      )}

      {/* Stretched link: makes the whole card clickable */}
      <Link
        href={`/t/${card.slug}`}
        aria-label={card.full_name}
        className="absolute inset-0 z-[1] rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
      />
      {/* Favorite heart — top-right corner, above the stretched link */}
      <FavoriteButton
        teacherId={card.user_id}
        bare
        className="absolute right-3 top-3 z-[2]"
      />
      {videoUrl !== undefined ? (
        // Catalog: italki-style media box. z-[2] keeps the play button/video
        // controls above the card's stretched link; the name & CTA still nav.
        <TeacherMedia
          name={card.full_name}
          videoUrl={videoUrl}
          posterUrl={card.avatar_url}
          playLabel={t("playVideo")}
          rounded="rounded-xl"
          className="relative z-[2] sm:w-56 sm:shrink-0"
        />
      ) : (
        <Avatar
          src={card.avatar_url}
          name={card.full_name}
          size="xl"
          className="h-24 w-24 shrink-0 text-2xl ring-2 ring-white"
        />
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-lg font-bold text-zinc-900">
            {card.full_name}
          </h3>
          {card.is_verified && <Badge variant="verified" />}
          {card.has_free_trial && <Badge variant="trial" />}
        </div>

        {headline && (
          <p className="mt-1.5 line-clamp-1 text-sm font-medium text-zinc-700">
            {headline}
          </p>
        )}
        {bioText && (
          <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{bioText}</p>
        )}

        {subjects.length > 0 && (
          <p className="mt-1.5 line-clamp-1 text-xs text-zinc-400">
            {subjects.join(" · ")}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <RatingStars
            value={Number(card.rating_avg)}
            count={card.rating_count}
            size={14}
          />
          <span className="text-xs text-zinc-400">
            {t("lessons", { count: card.lessons_done })}
          </span>
          {card.teaching_langs.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {card.teaching_langs.map((code) => (
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

      {/* Price + CTA — grouped at the bottom (button last) so the price sits in
          the lower area and the top-right corner stays clear for the heart */}
      <div className="flex shrink-0 flex-col gap-3 border-t border-zinc-100 pt-4 sm:w-44 sm:justify-end sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 sm:text-right">
        <Price
          tiyin={card.min_price_60}
          from
          suffix={t("perLesson")}
          className="text-lg sm:text-right"
        />
        <Link
          href={`/t/${card.slug}`}
          className={buttonClasses(
            isPro ? "primary" : "secondary",
            "md",
            "relative z-[2] w-full",
          )}
        >
          {t("choose")}
        </Link>
      </div>
    </article>
  );
}
