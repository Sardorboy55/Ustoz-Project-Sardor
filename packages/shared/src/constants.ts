// Platform-wide constants. Business parameters that admins can change live in
// the app_settings table — these are their keys plus hard product invariants.

export const LOCALES = ['uz', 'ru'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'uz';

export const TIMEZONE = 'Asia/Tashkent';

/** Lesson durations in minutes. 20 is reserved for the free trial. */
export const LESSON_DURATIONS = [30, 60, 90] as const;
export const TRIAL_FREE_DURATION = 20;

export const PACKAGE_SIZES = [5, 10, 20] as const;

/** 1 UZS = 100 tiyin. All money in DB/API is integer tiyin. */
export const TIYIN_PER_UZS = 100;

export const tiyinToUzs = (tiyin: number): number => Math.round(tiyin) / TIYIN_PER_UZS;
export const uzsToTiyin = (uzs: number): number => Math.round(uzs * TIYIN_PER_UZS);

/** Format tiyin as a UZS string, e.g. 8_000_000 → "80 000". Currency suffix is up to the caller. */
export const formatUzs = (tiyin: number, locale: Locale = 'uz'): string =>
  new Intl.NumberFormat(locale === 'uz' ? 'uz-UZ' : 'ru-RU', {
    maximumFractionDigits: 0,
  }).format(tiyinToUzs(tiyin));

/** Keys of the app_settings table (admin-tunable parameters). */
export const APP_SETTING_KEYS = [
  'pro_price',
  'free_monthly_lessons_limit',
  'free_max_subjects',
  'pro_max_subjects',
  'cancel_window_hours',
  'payout_hold_hours',
  'payout_min_amount',
  'acquiring_pct',
  'chat_masking_enabled',
  'package_ttl_months',
  'pro_search_boost',
  'pending_payment_ttl_min',
  'trial_free_duration_min',
  'no_show_wait_min',
  'xp_rules',
  'level_thresholds',
  'level_names',
  'platform_domains',
] as const;
export type AppSettingKey = (typeof APP_SETTING_KEYS)[number];

/** Storage buckets. */
export const BUCKETS = {
  avatars: 'avatars',
  introVideos: 'intro-videos',
  chatFiles: 'chat-files',
  homework: 'homework',
} as const;

/** Catalog "recommended" sort formula (docs/04 §4.2). */
export const recommendedScore = (args: {
  searchBoost: number;
  ratingAvg: number;
  lessonsDone: number;
}): number => args.searchBoost + args.ratingAvg * 10 + Math.log(args.lessonsDone + 1) * 5;
