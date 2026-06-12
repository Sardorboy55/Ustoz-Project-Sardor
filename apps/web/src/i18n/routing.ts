import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['uz', 'ru'],
  defaultLocale: 'uz',
  localePrefix: 'as-needed', // uz (default) without prefix, /ru/... for Russian
});

export type AppLocale = (typeof routing.locales)[number];
