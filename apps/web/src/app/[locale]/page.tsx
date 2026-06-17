import {
  BadgeCheck,
  BookOpen,
  Brain,
  Briefcase,
  CalendarCheck,
  Check,
  Code2,
  Dumbbell,
  GraduationCap,
  Languages,
  LayoutGrid,
  MessagesSquare,
  MonitorPlay,
  Music,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";
import Form from "next/form";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname, Link } from "@/i18n/navigation";
import {
  fetchCatalog,
  fetchCategories,
  fetchTeacherVideos,
  type CatalogCard,
} from "@/lib/catalog";
import { Testimonials } from "@/components/testimonials";
import { ScrollToTop } from "@/components/scroll-to-top";
import { ButtonLink, buttonClasses } from "@/components/ui/button";import { SectionHeading } from "@/components/ui/section-heading";
import { FavoritesProvider } from "@/components/favorites";
import { TeacherTile } from "@/components/teacher-tile";
import { localizeContent } from "@/lib/content-i18n";
import { FaqItem } from "@/components/faq";

export const revalidate = 300;

type Category = {
  id: string;
  slug: string | null;
  name_uz: string;
  name_ru: string;
  icon: string | null;
};

/** Seed categories — rendered when the DB is unreachable (e.g. CI build). */
const FALLBACK_CATEGORIES: Category[] = [
  { id: "1", slug: "tillar", name_uz: "Tillar", name_ru: "Языки", icon: "languages" },
  { id: "2", slug: "maktab-fanlari", name_uz: "Maktab fanlari", name_ru: "Школьные предметы", icon: "school" },
  { id: "3", slug: "it", name_uz: "IT va dasturlash", name_ru: "IT и программирование", icon: "code" },
  { id: "4", slug: "psixologiya", name_uz: "Psixologiya va kouching", name_ru: "Психология и коучинг", icon: "brain" },
  { id: "5", slug: "biznes", name_uz: "Biznes va moliya", name_ru: "Бизнес и финансы", icon: "briefcase" },
  { id: "6", slug: "ijod-musiqa", name_uz: "Ijod va musiqa", name_ru: "Творчество и музыка", icon: "music" },
  { id: "7", slug: "sport", name_uz: "Sport va salomatlik", name_ru: "Спорт и здоровье", icon: "dumbbell" },
  { id: "8", slug: "boshqa", name_uz: "Boshqa", name_ru: "Другое", icon: "sparkles" },
];

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  languages: Languages,
  school: GraduationCap,
  code: Code2,
  brain: Brain,
  briefcase: Briefcase,
  music: Music,
  dumbbell: Dumbbell,
  sparkles: Sparkles,
};

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Landing" });

  let categories: Category[] = [];
  try {
    categories = (await fetchCategories()) as Category[];
  } catch {
    // graceful: fall back to seed categories below
  }
  if (categories.length === 0) categories = FALLBACK_CATEGORIES;

  let topTeachers: CatalogCard[] = [];
  try {
    topTeachers = await fetchCatalog({ sort: "recommended", perPage: 6 });
  } catch {
    // graceful: hero falls back to a static mock, the section hides itself
  }

  const teacherVideos = await fetchTeacherVideos(
    topTeachers.map((c) => c.user_id),
  );

  const catName = (c: Category) => localizeContent(locale, c.name_uz, c.name_ru);
  const catalogPath = getPathname({ locale, href: "/catalog" });

  const trustItems: Array<{
    icon: LucideIcon;
    value: string;
    label: string;
    tint: string;
  }> = [
    { icon: LayoutGrid, value: "8", label: t("trust1"), tint: "bg-indigo-50 text-indigo-600" },
    { icon: BookOpen, value: "35+", label: t("trust2"), tint: "bg-emerald-50 text-emerald-600" },
    { icon: ShieldCheck, value: t("trustV3"), label: t("trust3"), tint: "bg-sky-50 text-sky-600" },
    { icon: MessagesSquare, value: t("trustV4"), label: t("trust4"), tint: "bg-violet-50 text-violet-600" },
  ];

  const steps: Array<{ icon: LucideIcon; title: string; body: string }> = [
    { icon: Search, title: t("how1Title"), body: t("how1Body") },
    { icon: CalendarCheck, title: t("how2Title"), body: t("how2Body") },
    { icon: MonitorPlay, title: t("how3Title"), body: t("how3Body") },
  ];

  const whyItems: Array<{ icon: LucideIcon; title: string; body: string }> = [
    { icon: BadgeCheck, title: t("why1Title"), body: t("why1Body") },
    { icon: ShieldCheck, title: t("why2Title"), body: t("why2Body") },
    { icon: Star, title: t("why3Title"), body: t("why3Body") },
    { icon: MessagesSquare, title: t("why4Title"), body: t("why4Body") },
  ];

  const reviews = [
    { name: t("rev1Name"), role: t("rev1Role"), text: t("rev1Text") },
    { name: t("rev2Name"), role: t("rev2Role"), text: t("rev2Text") },
    { name: t("rev3Name"), role: t("rev3Role"), text: t("rev3Text") },
    { name: t("rev4Name"), role: t("rev4Role"), text: t("rev4Text") },
    { name: t("rev5Name"), role: t("rev5Role"), text: t("rev5Text") },
    { name: t("rev6Name"), role: t("rev6Role"), text: t("rev6Text") },
  ].map((r) => ({ ...r, rating: 5 }));

  const faq = [1, 2, 3, 4, 5, 6].map((i) => ({
    q: t(`faq${i}Q` as "faq1Q"),
    a: t(`faq${i}A` as "faq1A"),
  }));

  return (
    <main className="flex-1">
      {/* ============================== Hero ============================== */}
      <section className="relative isolate overflow-hidden bg-zinc-900">
        {/* Full-bleed background photo */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{ backgroundImage: "url('/hero.jpg')" }}
        />
        {/* Dark overlay so the title, search and buttons stay readable */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-b from-zinc-950/75 via-zinc-900/60 to-zinc-950/80"
        />

        <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pb-20 pt-20 text-center sm:px-6 lg:pb-28 lg:pt-28">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white drop-shadow-sm sm:text-5xl">
            {t("heroTitlePre")}
            <span className="text-brand-300">{t("heroTitleHighlight")}</span>
            {t("heroTitlePost")}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-100">
            {t("heroSubtitle")}
          </p>

          <Form
            action={catalogPath}
            className="mt-8 flex w-full max-w-xl items-center gap-2 rounded-2xl border border-white/20 bg-white p-2 shadow-xl focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100"
          >
            <Search size={20} aria-hidden="true" className="ml-2 shrink-0 text-zinc-400" />
            <input
              type="search"
              name="q"
              placeholder={t("searchPlaceholder")}
              className="h-11 w-full min-w-0 bg-transparent text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            />
            <button type="submit" className={buttonClasses("primary", "md", "shrink-0")}>
              {t("searchCta")}
            </button>
          </Form>

          <div className="mt-6 flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:justify-center">
            <ButtonLink href="/catalog" size="lg" className="w-full shadow-lg sm:w-auto">
              {t("ctaFind")}
            </ButtonLink>
            <ButtonLink
              href="/become-teacher"
              size="lg"
              variant="secondary"
              className="w-full bg-white shadow-lg sm:w-auto"
            >
              {t("ctaBecome")}
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* ===================== Stats / trust band ===================== */}
      <section className="border-y border-zinc-200 bg-gradient-to-r from-brand-50/40 via-white to-brand-50/40">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-6 px-4 py-7 sm:px-6 lg:grid-cols-4">
          {trustItems.map(({ icon: Icon, value, label, tint }) => (
            <div
              key={label}
              className="flex items-center justify-center gap-3 sm:gap-3.5"
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tint}`}
              >
                <Icon size={22} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-extrabold leading-tight tracking-tight text-zinc-900 sm:text-xl">
                  {value}
                </p>
                <p className="text-xs leading-tight text-zinc-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================ Categories =========================== */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionHeading title={t("categoriesTitle")} subtitle={t("categoriesSubtitle")} />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => {
            const Icon = CATEGORY_ICONS[category.icon ?? ""] ?? Sparkles;
            return (
              <Link
                key={category.id}
                href={
                  category.slug
                    ? { pathname: "/catalog", query: { category: category.slug } }
                    : "/catalog"
                }
                className="group flex items-center gap-3.5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm outline-none transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="min-w-0 text-sm font-semibold text-zinc-900">
                  {catName(category)}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* =========================== How it works ========================== */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading title={t("howTitle")} subtitle={t("howSubtitle")} />
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {steps.map(({ icon: Icon, title, body }, i) => (
              <div
                key={title}
                className="relative rounded-2xl border border-zinc-200 bg-page p-6"
              >
                <span className="absolute right-5 top-4 text-4xl font-extrabold text-zinc-100">
                  {i + 1}
                </span>
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-zinc-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================== Top teachers =========================== */}
      {topTeachers.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          {/* Centered title + subtitle (italki-style) */}
          <div className="text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
              {t("topTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-zinc-500">
              {t("topSubtitle")}
            </p>
          </div>

          {/* Two rows of teacher tiles */}
          <FavoritesProvider>
            <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {topTeachers.slice(0, 6).map((card) => (
                <TeacherTile
                  key={card.user_id}
                  card={card}
                  videoUrl={teacherVideos[card.user_id]?.url}
                  posterUrl={teacherVideos[card.user_id]?.poster}
                />
              ))}
            </div>
          </FavoritesProvider>

          {/* White "find more teachers" CTA */}
          <div className="mt-10 flex justify-center">
            <ButtonLink href="/catalog" size="lg" variant="secondary">
              {t("findMore")}
            </ButtonLink>
          </div>
        </section>
      )}

      {/* ============================ Why USTOZ ============================ */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
              {t("whyTitle")}
            </h2>
          </div>
          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {whyItems.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-zinc-200 bg-page p-6 transition hover:border-brand-200 hover:shadow-sm"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-bold text-zinc-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================== Testimonials ========================== */}
      <Testimonials title={t("reviewsTitle")} items={reviews} />

      {/* ===================== Big "become a teacher" banner ===================== */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 px-6 py-14 text-white shadow-xl sm:px-14 sm:py-16">
          {/* decorative glows */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl"
          />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-50 ring-1 ring-white/20">
              <GraduationCap size={14} aria-hidden="true" />
              {t("ctaBecome")}
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              {t("teachersTitle")}
            </h2>
            <p className="mt-3 text-lg text-brand-100">{t("teachersSubtitle")}</p>
            <ul className="mt-6 space-y-3">
              {[t("tBullet1"), t("tBullet2"), t("tBullet3")].map((bullet) => (
                <li key={bullet} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/60">
                    <Check size={13} aria-hidden="true" />
                  </span>
                  <span className="text-sm text-brand-50">{bullet}</span>
                </li>
              ))}
            </ul>
            <ButtonLink
              href="/become-teacher"
              size="lg"
              variant="secondary"
              className="mt-8 border-transparent shadow-md"
            >
              {t("teachersCta")}
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* =============================== FAQ =============================== */}
      <section id="faq" className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            {t("faqTitle")}
          </h2>
          <div className="mt-8 space-y-3">
            {faq.map(({ q, a }) => (
              <FaqItem key={q} question={q} answer={a} />
            ))}
          </div>
        </div>
      </section>

      {/* ============================ Final CTA ============================ */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-brand-100 bg-brand-50 px-6 py-12 text-center">
          <h2 className="mx-auto max-w-xl text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
            {t("finalTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-zinc-600">{t("finalSubtitle")}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/catalog" size="lg">
              {t("ctaFind")}
            </ButtonLink>
            <ButtonLink href="/become-teacher" size="lg" variant="secondary">
              {t("ctaBecome")}
            </ButtonLink>
          </div>
        </div>
      </section>

      <ScrollToTop />
    </main>
  );
}
