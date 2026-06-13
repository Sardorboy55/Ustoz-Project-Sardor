import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { publicClient } from "@/lib/supabase/public";
import { Wordmark } from "@/components/brand";

type FooterCategory = { slug: string; name_uz: string; name_ru: string };

/** Top-4 seed categories — used when the DB is unreachable (e.g. CI build). */
const FALLBACK_CATEGORIES: FooterCategory[] = [
  { slug: "tillar", name_uz: "Tillar", name_ru: "Языки" },
  { slug: "maktab-fanlari", name_uz: "Maktab fanlari", name_ru: "Школьные предметы" },
  { slug: "it", name_uz: "IT va dasturlash", name_ru: "IT и программирование" },
  { slug: "psixologiya", name_uz: "Psixologiya va kouching", name_ru: "Психология и коучинг" },
];

async function topCategories(): Promise<FooterCategory[]> {
  try {
    const { data, error } = await publicClient()
      .from("categories")
      .select("slug, name_uz, name_ru")
      .eq("is_active", true)
      .order("sort", { ascending: true })
      .limit(4);
    if (error || !data || data.length === 0) return FALLBACK_CATEGORIES;
    return data as FooterCategory[];
  } catch {
    return FALLBACK_CATEGORIES;
  }
}

const headingClasses = "text-sm font-semibold text-zinc-900";
const linkClasses =
  "text-sm text-zinc-500 transition-colors hover:text-brand-700";

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  const locale = await getLocale();
  const categories = await topCategories();

  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-6">
          <div className="sm:col-span-2 lg:col-span-2 lg:pr-10">
            <Wordmark />
            <p className="mt-3 max-w-xs text-sm text-zinc-500">{t("tagline")}</p>
          </div>

          <nav aria-label={t("platform")} className="flex flex-col gap-2.5">
            <h3 className={headingClasses}>{t("platform")}</h3>
            <Link href="/catalog" className={linkClasses}>
              {t("catalog")}
            </Link>
            <Link href="/become-teacher" className={linkClasses}>
              {t("becomeTeacher")}
            </Link>
          </nav>

          <nav aria-label={t("categories")} className="flex flex-col gap-2.5">
            <h3 className={headingClasses}>{t("categories")}</h3>
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={{ pathname: "/catalog", query: { category: c.slug } }}
                className={linkClasses}
              >
                {locale === "ru" ? c.name_ru : c.name_uz}
              </Link>
            ))}
          </nav>

          <nav aria-label={t("help")} className="flex flex-col gap-2.5">
            <h3 className={headingClasses}>{t("help")}</h3>
            <Link href="/#faq" className={linkClasses}>
              {t("faq")}
            </Link>
            <a href="mailto:support@ustoz.uz" className={linkClasses}>
              {t("support")}
            </a>
          </nav>

          <div className="flex flex-col gap-2.5">
            <h3 className={headingClasses}>{t("docs")}</h3>
            <span className="cursor-not-allowed text-sm text-zinc-400">
              {t("offer")}{" "}
              <span className="text-xs text-zinc-400">({t("soon")})</span>
            </span>
            <span className="cursor-not-allowed text-sm text-zinc-400">
              {t("privacy")}{" "}
              <span className="text-xs text-zinc-400">({t("soon")})</span>
            </span>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-zinc-100 pt-6 text-sm text-zinc-500 sm:flex-row">
          <span>
            © {new Date().getFullYear()} USTOZ. {t("rights")}.
          </span>
          <span>{t("madeIn")} 🇺🇿</span>
        </div>
      </div>
    </footer>
  );
}
