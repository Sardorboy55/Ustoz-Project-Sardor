import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";

export default function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return <Landing />;
}

function Landing() {
  const t = useTranslations("Landing");
  const nav = useTranslations("Nav");
  const footer = useTranslations("Footer");

  const steps = [
    { title: t("how1Title"), body: t("how1Body") },
    { title: t("how2Title"), body: t("how2Body") },
    { title: t("how3Title"), body: t("how3Body") },
  ];

  return (
    <>
      <header className="border-b border-zinc-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-extrabold tracking-wide text-teal-700">
            USTOZ
          </Link>
          <nav className="flex items-center gap-6 text-sm text-zinc-600">
            <span className="cursor-not-allowed opacity-50">{nav("catalog")}</span>
            <span className="hidden cursor-not-allowed opacity-50 sm:inline">
              {nav("forTeachers")}
            </span>
            <LocaleSwitcher />
            <span className="rounded-lg bg-teal-700 px-4 py-2 font-medium text-white opacity-50">
              {nav("signIn")}
            </span>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600">{t("subtitle")}</p>
          <div className="mt-10 flex justify-center gap-4">
            <span className="cursor-not-allowed rounded-xl bg-teal-700 px-8 py-3 font-semibold text-white opacity-60">
              {t("ctaFind")}
            </span>
            <span className="cursor-not-allowed rounded-xl border border-teal-700 px-8 py-3 font-semibold text-teal-700 opacity-60">
              {t("ctaBecome")}
            </span>
          </div>
          <p className="mt-4 text-xs text-zinc-400">Phase 0 — каркас / skelet</p>
        </section>

        <section className="bg-zinc-50 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-2xl font-bold">{t("howTitle")}</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {steps.map((step, i) => (
                <div key={i} className="rounded-2xl bg-white p-6 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-700 font-bold text-white">
                    {i + 1}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-zinc-600">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-100 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-zinc-500 sm:flex-row">
          <span>© {new Date().getFullYear()} USTOZ. {footer("rights")}.</span>
          <div className="flex gap-6">
            <span className="cursor-not-allowed opacity-60">{footer("offer")}</span>
            <span className="cursor-not-allowed opacity-60">{footer("privacy")}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
