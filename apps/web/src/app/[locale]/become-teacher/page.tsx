import type { Metadata } from "next";
import {
  BookOpen,
  CalendarClock,
  Camera,
  CircleCheck,
  ClipboardCheck,
  FileText,
  IdCard,
  MessagesSquare,
  TrendingUp,
  UserRoundCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BecomeTeacherCta } from "@/components/teacher/become-teacher-cta";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { FaqItem } from "@/components/faq";

const SITE = process.env.APP_BASE_URL ?? "https://ustoz.uz";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "BecomeTeacher" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: `${SITE}${locale === "uz" ? "" : "/ru"}/become-teacher`,
      languages: {
        uz: `${SITE}/become-teacher`,
        ru: `${SITE}/ru/become-teacher`,
      },
    },
  };
}

export default async function BecomeTeacherPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "BecomeTeacher" });

  const steps: Array<{ icon: LucideIcon; title: string; body: string }> = [
    { icon: ClipboardCheck, title: t("step1Title"), body: t("step1Body") },
    { icon: BookOpen, title: t("step2Title"), body: t("step2Body") },
    { icon: CalendarClock, title: t("step3Title"), body: t("step3Body") },
    { icon: UserRoundCheck, title: t("step4Title"), body: t("step4Body") },
  ];

  const gives: Array<{ icon: LucideIcon; title: string; body: string }> = [
    { icon: CalendarClock, title: t("give1Title"), body: t("give1Body") },
    { icon: Wallet, title: t("give2Title"), body: t("give2Body") },
    { icon: MessagesSquare, title: t("give3Title"), body: t("give3Body") },
    { icon: TrendingUp, title: t("give4Title"), body: t("give4Body") },
  ];

  const requirements: Array<{ icon: LucideIcon; label: string }> = [
    { icon: IdCard, label: t("req1") },
    { icon: Camera, label: t("req2") },
    { icon: FileText, label: t("req3") },
  ];

  const faq = [1, 2, 3, 4, 5].map((i) => ({
    q: t(`faq${i}Q` as "faq1Q"),
    a: t(`faq${i}A` as "faq1A"),
  }));

  return (
    <main className="flex-1">
      {/* ============================== Hero ============================== */}
      <section className="bg-gradient-to-br from-brand-700 to-brand-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-brand-100">
            {t("heroSubtitle")}
          </p>
          <div className="mt-8">
            <BecomeTeacherCta
              label={t("heroCta")}
              className="bg-brand-500 text-white shadow-md hover:bg-brand-400 active:bg-brand-600"
            />
          </div>
        </div>
      </section>

      {/* =========================== How it starts ========================= */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionHeading title={t("howTitle")} />
        <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <span className="absolute right-5 top-4 text-4xl font-extrabold text-zinc-100">
                {i + 1}
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon size={20} aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-bold text-zinc-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ======================= What the platform gives ==================== */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading title={t("giveTitle")} />
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {gives.map(({ icon: Icon, title, body }, i) => (
              <div key={title} className="flex gap-4 rounded-2xl border border-zinc-200 bg-page p-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="flex items-center gap-2 font-bold text-zinc-900">
                    {title}
                    {i === 3 && <Badge variant="pro" />}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ Requirements ========================== */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-brand-100 bg-brand-50 p-6 sm:p-10">
          <SectionHeading title={t("reqTitle")} />
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {requirements.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-zinc-900">{label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 flex items-start gap-2.5 text-sm text-zinc-600">
            <CircleCheck size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-brand-600" />
            {t("reqNote")}
          </p>
        </div>
      </section>

      {/* =============================== FAQ =============================== */}
      <section className="bg-white py-16">
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
        <div className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 px-6 py-12 text-center text-white">
          <h2 className="mx-auto max-w-xl text-2xl font-extrabold tracking-tight sm:text-3xl">
            {t("ctaTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-brand-100">{t("ctaSubtitle")}</p>
          <div className="mt-7">
            <BecomeTeacherCta
              label={t("cta")}
              className="bg-brand-500 text-white shadow-md hover:bg-brand-400 active:bg-brand-600"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
