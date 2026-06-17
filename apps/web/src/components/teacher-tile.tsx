import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CatalogCard } from "@/lib/catalog";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { FavoriteButton } from "@/components/favorites";
import { TeacherMedia } from "@/components/teacher-media";
import { localizeList } from "@/lib/content-i18n";

/**
 * Vertical italki-style teacher tile: media on top (intro video behind a play
 * button, falling back to the avatar/initials poster) with the favorite heart
 * and rating overlaid; the info block below links to the teacher's profile.
 * Render inside a FavoritesProvider (3-column grid).
 */
export function TeacherTile({
  card,
  videoUrl,
  posterUrl,
}: {
  card: CatalogCard;
  videoUrl?: string | null;
  /** Cover image (intro_video_poster_url) shown before play; falls back to the avatar. */
  posterUrl?: string | null;
}) {
  const locale = useLocale();
  const t = useTranslations("TeacherCard");

  const headline = locale === "ru" ? card.headline_ru : card.headline_uz;
  const subjects = localizeList(locale, card.subjects_uz, card.subjects_ru);
  const langLabel = (code: string) =>
    t.has(`langs.${code}`) ? t(`langs.${code}`) : code.toUpperCase();

  return (
    <article
      data-testid="teacher-tile"
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg"
    >
      {/* Media: intro video behind a play button (poster = avatar / initials) */}
      <div className="relative">
        <TeacherMedia
          name={card.full_name}
          videoUrl={videoUrl}
          posterUrl={posterUrl ?? card.avatar_url}
          playLabel={t("playVideo")}
          rounded="rounded-none"
        />
        <FavoriteButton
          teacherId={card.user_id}
          className="absolute right-3 top-3 z-[3]"
        />
        <div className="pointer-events-none absolute bottom-3 right-3 z-[3] flex flex-col items-end gap-1">
          <span className="rounded-full bg-black/55 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur">
            <span className="text-accent-400">★</span>{" "}
            {Number(card.rating_avg).toFixed(1)}
            {card.rating_count > 0 && (
              <span className="font-normal text-white/70">
                {" "}
                ({card.rating_count})
              </span>
            )}
          </span>
          <span className="rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-white/90 backdrop-blur">
            {t("lessons", { count: card.lessons_done })}
          </span>
        </div>
      </div>

      {/* Info — links to the teacher profile */}
      <Link
        href={`/t/${card.slug}`}
        className="flex flex-1 flex-col p-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600"
      >
        <h3 className="truncate text-base font-bold text-zinc-900 transition-colors group-hover:text-brand-700">
          {card.full_name}
        </h3>

        {(card.is_verified || card.tier === "pro" || card.has_free_trial) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {card.is_verified && <Badge variant="verified" />}
            {card.tier === "pro" && <Badge variant="pro" />}
            {card.has_free_trial && <Badge variant="trial" />}
          </div>
        )}

        {headline && (
          <p className="mt-1.5 line-clamp-2 text-sm text-zinc-600">{headline}</p>
        )}

        {subjects.length > 0 && (
          <p className="mt-1 line-clamp-1 text-xs text-zinc-400">
            {subjects.join(" · ")}
          </p>
        )}

        {card.teaching_langs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
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

        <div className="mt-auto pt-3">
          <Price tiyin={card.min_price_60} from suffix={t("perLesson")} />
        </div>
      </Link>
    </article>
  );
}
