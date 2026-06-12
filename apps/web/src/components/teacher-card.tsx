import { Link } from "@/i18n/navigation";
import type { CatalogCard } from "@/lib/catalog";

const fmt = (tiyin: number) => Math.round(tiyin / 100).toLocaleString("ru-RU");

export function TeacherCard({ card, locale, t }: {
  card: CatalogCard;
  locale: string;
  t: {
    from: string;
    perHour: string;
    freeTrial: string;
    lessons: string;
  };
}) {
  const headline = locale === "ru" ? card.headline_ru : card.headline_uz;
  const subjects = locale === "ru" ? card.subjects_ru : card.subjects_uz;
  const initials = card.full_name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Link
      href={`/t/${card.slug}`}
      data-testid="teacher-card"
      className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-teal-600 hover:shadow-md"
    >
      {card.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.avatar_url}
          alt={card.full_name}
          className="h-16 w-16 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-teal-100 text-lg font-bold text-teal-800">
          {initials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{card.full_name}</span>
          {card.tier === "pro" && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">
              PRO
            </span>
          )}
          {card.is_verified && (
            <span className="text-teal-600" title="Verified">✓</span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-1 text-sm text-zinc-600">{headline}</p>
        <p className="mt-1 line-clamp-1 text-xs text-zinc-400">{subjects.join(" · ")}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="font-semibold text-zinc-900">
            {t.from} {fmt(card.min_price_60)} UZS{t.perHour}
          </span>
          <span className="text-amber-600">
            ★ {Number(card.rating_avg).toFixed(1)}
            <span className="text-zinc-400"> ({card.rating_count})</span>
          </span>
          <span className="text-zinc-400">
            {card.lessons_done} {t.lessons}
          </span>
          {card.has_free_trial && (
            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
              {t.freeTrial}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
