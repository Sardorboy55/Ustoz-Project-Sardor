import {
  ArrowRight,
  BookOpen,
  Brain,
  Briefcase,
  CalendarCheck,
  Check,
  ClipboardCheck,
  Code2,
  Dumbbell,
  GraduationCap,
  Headset,
  Languages,
  LayoutGrid,
  MessagesSquare,
  MonitorPlay,
  Music,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Form from "next/form";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname, Link } from "@/i18n/navigation";
import { fetchCatalog, fetchCategories, type CatalogCard } from "@/lib/catalog";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { RatingStars } from "@/components/ui/rating-stars";
import { SectionHeading } from "@/components/ui/section-heading";
import { FavoritesProvider } from "@/components/favorites";
import { TeacherCard } from "@/components/teacher-card";
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
    topTeachers = await fetchCatalog({ sort: "recommended", perPage: 4 });
  } catch {
    // graceful: hero falls back to a static mock, the section hides itself
  }

  const heroTeachers: Array<{
    name: string;
    subject: string;
    rating: number;
    avatarUrl: string | null;
  }> = topTeachers.slice(0, 2).map((card) => ({
    name: card.full_name,
    subject:
      (locale === "ru" ? card.subjects_ru : card.subjects_uz)[0] ??
      (locale === "ru" ? card.headline_ru : card.headline_uz),
    rating: Number(card.rating_avg),
    avatarUrl: card.avatar_url,
  }));
  if (heroTeachers.length < 2) {
    heroTeachers.splice(
      0,
      heroTeachers.length,
      { name: t("mock1Name"), subject: t("mock1Subject"), rating: 4.9, avatarUrl: null },
      { name: t("mock2Name"), subject: t("mock2Subject"), rating: 4.8, avatarUrl: null },
    );
  }

  const catName = (c: Category) => (locale === "ru" ? c.name_ru : c.name_uz);
  const catalogPath = getPathname({ locale, href: "/catalog" });

  const trustItems: Array<{ icon: LucideIcon; label: string }> = [
    { icon: LayoutGrid, label: t("trust1") },
    { icon: BookOpen, label: t("trust2") },
    { icon: ShieldCheck, label: t("trust3") },
    { icon: MessagesSquare, label: t("trust4") },
  ];

  const steps: Array<{ icon: LucideIcon; title: string; body: string }> = [
    { icon: Search, title: t("how1Title"), body: t("how1Body") },
    { icon: CalendarCheck, title: t("how2Title"), body: t("how2Body") },
    { icon: MonitorPlay, title: t("how3Title"), body: t("how3Body") },
  ];

  const whyItems: Array<{ icon: LucideIcon; title: string; body: string }> = [
    { icon: ClipboardCheck, title: t("why1Title"), body: t("why1Body") },
    { icon: ShieldCheck, title: t("why2Title"), body: t("why2Body") },
    { icon: Star, title: t("why3Title"), body: t("why3Body") },
    { icon: Headset, title: t("why4Title"), body: t("why4Body") },
  ];

  const faq = [1, 2, 3, 4, 5, 6].map((i) => ({
    q: t(`faq${i}Q` as "faq1Q"),
    a: t(`faq${i}A` as "faq1A"),
  }));

  return (
    <main className="flex-1">
      {/* ============================== Hero ============================== */}
      <section className="bg-gradient-to-b from-brand-50 via-white to-page">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1fr_420px] lg:gap-16 lg:pb-24 lg:pt-20">
          <div>
            <h1 className="max-w-xl text-4xl font-extrabold leading-tight tracking-tight text-zinc-900 sm:text-5xl">
              {t("heroTitlePre")}
              <span className="text-brand-600">{t("heroTitleHighlight")}</span>
              {t("heroTitlePost")}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-600">
              {t("heroSubtitle")}
            </p>

            <Form
              action={catalogPath}
              className="mt-8 flex max-w-xl items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100"
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

            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/catalog" size="lg">
                {t("ctaFind")}
              </ButtonLink>
              <ButtonLink href="/become-teacher" size="lg" variant="secondary">
                {t("ctaBecome")}
              </ButtonLink>
            </div>
          </div>

          {/* CSS collage: teacher mini-cards + floating chips + mini calendar */}
          <div className="relative hidden h-[420px] select-none lg:block" aria-hidden="true">
            <div className="absolute -right-10 top-6 h-72 w-72 rounded-full bg-brand-200/50 blur-3xl" />
            <div className="absolute bottom-10 left-0 h-56 w-56 rounded-full bg-accent-200/40 blur-3xl" />

            <div className="absolute left-0 top-8 w-64 rounded-2xl border border-zinc-100 bg-white p-4 shadow-lg">
              <div className="flex items-center gap-3">
                <Avatar src={heroTeachers[0].avatarUrl} name={heroTeachers[0].name} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-zinc-900">{heroTeachers[0].name}</p>
                  <p className="truncate text-xs text-zinc-500">{heroTeachers[0].subject}</p>
                </div>
              </div>
              <RatingStars value={heroTeachers[0].rating} size={13} className="mt-3" />
            </div>

            <div className="absolute bottom-6 right-0 w-64 rounded-2xl border border-zinc-100 bg-white p-4 shadow-lg">
              <div className="flex items-center gap-3">
                <Avatar src={heroTeachers[1].avatarUrl} name={heroTeachers[1].name} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-zinc-900">{heroTeachers[1].name}</p>
                  <p className="truncate text-xs text-zinc-500">{heroTeachers[1].subject}</p>
                </div>
              </div>
              <RatingStars value={heroTeachers[1].rating} size={13} className="mt-3" />
            </div>

            <div className="absolute right-6 top-2 flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-sm font-bold text-zinc-900 shadow-md">
              <Star size={15} className="text-accent-500" fill="currentColor" strokeWidth={0} />
              4.9
              <span className="font-normal text-zinc-400">{t("heroRatingLabel")}</span>
            </div>

            <div className="absolute left-10 bottom-24 flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-zinc-700 shadow-md">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {t("heroAvailableToday")}
            </div>

            <div className="absolute right-2 top-1/2 w-44 -translate-y-1/2 rounded-2xl border border-zinc-100 bg-white p-4 shadow-lg">
              <p className="text-xs font-semibold text-zinc-700">{t("heroSchedule")}</p>
              <div className="mt-3 grid grid-cols-7 gap-1.5">
                {Array.from({ length: 28 }, (_, i) => (
                  <span
                    key={i}
                    className={`h-3.5 w-3.5 rounded-md ${
                      [9, 12, 17, 22].includes(i)
                        ? "bg-brand-600"
                        : i === 15
                          ? "bg-accent-400"
                          : "bg-zinc-100"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================== Trust strip ========================== */}
      <section className="border-y border-zinc-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-4 px-4 py-6 sm:px-6 lg:grid-cols-4">
          {trustItems.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Icon size={17} aria-hidden="true" />
              </span>
              <span className="text-sm font-medium text-zinc-700">{label}</span>
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
          <SectionHeading
            title={t("topTitle")}
            subtitle={t("topSubtitle")}
            action={
              <Link
                href="/catalog"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                {t("topAll")}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            }
          />
          <FavoritesProvider>
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {topTeachers.map((card) => (
                <TeacherCard key={card.user_id} card={card} />
              ))}
            </div>
          </FavoritesProvider>
        </section>
      )}

      {/* ============================ Why trust ============================ */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading title={t("whyTitle")} />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {whyItems.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-zinc-200 bg-page p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-bold text-zinc-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================= For teachers band ======================== */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 px-6 py-12 text-white sm:px-12">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="max-w-lg text-2xl font-extrabold tracking-tight sm:text-3xl">
                {t("teachersTitle")}
              </h2>
              <p className="mt-3 max-w-lg text-brand-100">{t("teachersSubtitle")}</p>
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
            </div>
            <div className="flex flex-col items-start gap-3 lg:items-end">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                <Wallet size={26} aria-hidden="true" />
              </span>
              <ButtonLink
                href="/become-teacher"
                size="lg"
                className="bg-white text-brand-800 shadow-md hover:bg-brand-50 active:bg-brand-100"
              >
                {t("teachersCta")}
              </ButtonLink>
            </div>
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
    </main>
  );
}
