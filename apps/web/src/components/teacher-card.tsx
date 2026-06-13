import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CatalogCard } from "@/lib/catalog";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { RatingStars } from "@/components/ui/rating-stars";
import { buttonClasses } from "@/components/ui/button";
import { FavoriteButton } from "@/components/favorites";

/**
 * Marketplace teacher card (v2). The whole card is a link to /t/[slug]
 * (stretched-link pattern); the favorite heart floats above it.
 * Render inside a FavoritesProvider.
 */
export function TeacherCard({ card }: { card: CatalogCard }) {
  const locale = useLocale();
  const t = useTranslations("TeacherCard");

  const headline = locale === "ru" ? card.headline_ru : card.headline_uz;
  const subjects = locale === "ru" ? card.subjects_ru : card.subjects_uz;

  const langLabel = (code: string) =>
    t.has(`langs.${code}`) ? t(`langs.${code}`) : code.toUpperCase();

  return (
    <article
      data-testid="teacher-card"
      className="relative rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
    >
      {/* Stretched link: makes the whole card clickable */}
      <Link
        href={`/t/${card.slug}`}
        aria-label={card.full_name}
        className="absolute inset-0 z-[1] rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
      />
      <FavoriteButton
        teacherId={card.user_id}
        className="absolute right-4 top-4 z-10"
      />

      <div className="flex gap-4 sm:gap-5">
        <Avatar
          src={card.avatar_url}
          name={card.full_name}
          size="lg"
          className="h-20 w-20 text-xl"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 pr-10">
            <h3 className="truncate text-base font-bold text-zinc-900">
              {card.full_name}
            </h3>
            {card.is_verified && <Badge variant="verified" />}
            {card.tier === "pro" && <Badge variant="pro" />}
          </div>

          {headline && (
            <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{headline}</p>
          )}

          {subjects.length > 0 && (
            <p className="mt-1.5 line-clamp-1 text-xs text-zinc-400">
              {subjects.join(" · ")}
            </p>
          )}

          {card.teaching_langs.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
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

          {/* Mobile: rating + price below the info block */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 sm:hidden">
            <RatingStars
              value={Number(card.rating_avg)}
              count={card.rating_count}
              size={14}
            />
            <span className="text-xs text-zinc-400">
              {t("lessons", { count: card.lessons_done })}
            </span>
            <Price tiyin={card.min_price_60} from suffix={t("perLesson")} />
            {card.has_free_trial && <Badge variant="trial" />}
          </div>
        </div>

        {/* Desktop: right column with rating, price and the profile "button" */}
        <div className="hidden w-48 shrink-0 flex-col items-end gap-2 pr-1 pt-9 sm:flex">
          <RatingStars
            value={Number(card.rating_avg)}
            count={card.rating_count}
            size={15}
          />
          <span className="text-xs text-zinc-400">
            {t("lessons", { count: card.lessons_done })}
          </span>
          <Price
            tiyin={card.min_price_60}
            from
            suffix={t("perLesson")}
            className="text-right"
          />
          {card.has_free_trial && <Badge variant="trial" />}
          <span
            aria-hidden="true"
            className={buttonClasses("secondary", "sm", "mt-1 w-full")}
          >
            {t("profile")}
          </span>
        </div>
      </div>
    </article>
  );
}
