import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Wordmark } from "@/components/brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { AuthButton } from "@/components/auth-button";
import { MobileMenu } from "@/components/mobile-menu";

/** Sticky site header: wordmark, nav, locale switcher, auth island, burger. */
export function SiteHeader() {
  const t = useTranslations("Header");

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Wordmark />

        <nav className="hidden items-center gap-6 text-sm font-medium text-zinc-600 md:flex">
          <Link href="/catalog" className="transition-colors hover:text-brand-700">
            {t("catalog")}
          </Link>
          <Link
            href="/become-teacher"
            className="transition-colors hover:text-brand-700"
          >
            {t("forTeachers")}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <div className="hidden md:block">
            <AuthButton />
          </div>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
