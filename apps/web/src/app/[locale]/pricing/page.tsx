import type { Metadata } from "next";
import { Check } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ButtonLink } from "@/components/ui/button";

const SITE = process.env.APP_BASE_URL ?? "https://ustoz.uz";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Pricing" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: `${SITE}${locale === "uz" ? "" : "/ru"}/pricing`,
      languages: {
        uz: `${SITE}/pricing`,
        ru: `${SITE}/ru/pricing`,
      },
    },
  };
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Pricing" });

  const tiers = [
    {
      key: "free",
      name: t("freeName"),
      price: t("freePrice"),
      features: [t("free1"), t("free2"), t("free3"), t("free4")],
      cta: t("freeCta"),
      highlight: false,
    },
    {
      key: "pro",
      name: t("proName"),
      price: t("proPrice"),
      features: [t("pro1"), t("pro2"), t("pro3"), t("pro4"), t("pro5")],
      cta: t("proCta"),
      highlight: true,
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-zinc-600">{t("subtitle")}</p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {tiers.map((tier) => (
          <div
            key={tier.key}
            className={
              tier.highlight
                ? "relative rounded-3xl border-2 border-brand-500 bg-white p-8 shadow-lg"
                : "rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm"
            }
          >
            {tier.highlight && (
              <span className="absolute -top-3 left-8 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white">
                {t("popular")}
              </span>
            )}
            <h2 className="text-xl font-bold text-zinc-900">{tier.name}</h2>
            <div className="mt-4 flex items-end gap-1.5">
              <span className="text-4xl font-extrabold tracking-tight text-zinc-900">
                {tier.price}
              </span>
              <span className="pb-1 text-sm text-zinc-500">{t("perMonth")}</span>
            </div>
            <ul className="mt-6 space-y-3">
              {tier.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-3 text-sm text-zinc-700"
                >
                  <Check
                    size={18}
                    className="mt-0.5 shrink-0 text-brand-600"
                    aria-hidden="true"
                  />
                  {f}
                </li>
              ))}
            </ul>
            <ButtonLink
              href="/become-teacher"
              size="lg"
              variant={tier.highlight ? "primary" : "secondary"}
              className="mt-8 w-full"
            >
              {tier.cta}
            </ButtonLink>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-zinc-500">
        {t("note")}
      </p>
    </main>
  );
}
