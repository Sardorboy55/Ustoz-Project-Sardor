import type { Metadata } from "next";
import { Check, ChevronLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ProPayClient } from "./pro-pay-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Pricing" });
  return { title: `${t("checkoutTitle")} — IBILIM`, robots: { index: false } };
}

/**
 * PRO subscription checkout. Online payment (Click / Payme / Uzum) is not wired
 * yet (Phase 7), so the methods and the pay button are shown disabled with a
 * "soon" note — the layout is payment-ready for when the providers are added.
 */
export default async function ProCheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Pricing" });

  const features = [t("pro1"), t("pro2"), t("pro3"), t("pro4")];

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link
        href="/pricing"
        className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800"
      >
        <ChevronLeft size={16} aria-hidden="true" />
        {t("checkoutBack")}
      </Link>

      <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
        {t("checkoutTitle")}
      </h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Plan summary */}
        <div className="rounded-3xl border border-brand-200 bg-brand-50/40 p-6">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
              {t("proName")}
            </span>
          </div>
          <div className="mt-3 flex items-end gap-1.5">
            <span className="text-3xl font-extrabold tracking-tight text-zinc-900">
              {t("proPrice")}
            </span>
            <span className="pb-1 text-sm text-zinc-500">{t("perMonth")}</span>
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            {t("checkoutSummary")}
          </p>
          <ul className="mt-3 space-y-2.5">
            {features.map((f) => (
              <li
                key={f}
                className="flex items-start gap-2.5 text-sm text-zinc-700"
              >
                <Check
                  size={17}
                  className="mt-0.5 shrink-0 text-brand-600"
                  aria-hidden="true"
                />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Оплата Pro по QR (ручное подтверждение админом) */}
        <ProPayClient priceLabel={t("proPrice")} />
      </div>
    </main>
  );
}
