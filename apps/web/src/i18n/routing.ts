import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['uz', 'ru', 'en'],
  defaultLocale: 'uz',
  localePrefix: 'as-needed', // uz (default) without prefix, /ru/... for Russian
  // Project rule: default locale is Uzbek. Do NOT auto-detect from the browser
  // Accept-Language header (a Russian browser would otherwise land on ru).
  // First visit without an explicit choice → defaultLocale (uz). A user's
  // explicit switch is still remembered via the NEXT_LOCALE cookie set by the
  // middleware.
  localeDetection: false,
});

export type AppLocale = (typeof routing.locales)[number];
