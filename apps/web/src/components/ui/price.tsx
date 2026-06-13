import { useLocale, useTranslations } from "next-intl";
import { formatUzs, type Locale } from "@ustoz/shared";
import { cn } from "@/lib/cn";

/**
 * Money renderer: integer tiyin → "80 000 so'm" (uz) / "80 000 сум" (ru).
 * With `from`, renders "80 000 so'mdan" / "от 80 000 сум".
 */
export function Price({
  tiyin,
  from = false,
  suffix,
  className,
}: {
  /** Amount in tiyin (1 UZS = 100 tiyin), as stored in the DB. */
  tiyin: number;
  /** "from ..." form for minimum prices. */
  from?: boolean;
  /** Optional muted suffix, e.g. "/60 daq". */
  suffix?: string;
  className?: string;
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations("Ui");
  const price = formatUzs(tiyin, locale);

  return (
    <span className={cn("font-semibold text-zinc-900", className)}>
      {from ? t("priceFrom", { price }) : t("price", { price })}
      {suffix && <span className="font-normal text-zinc-500">{suffix}</span>}
    </span>
  );
}
