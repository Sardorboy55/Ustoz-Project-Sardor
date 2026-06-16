// Date/time helpers pinned to the product timezone (Asia/Tashkent, UTC+5,
// no DST). Timestamps live in UTC; every render goes through these.

export const TASHKENT_TZ = "Asia/Tashkent";

const intlTag = (locale: string) => (locale === "ru" ? "ru-RU" : "uz-UZ");

export const addDays = (d: Date, days: number): Date =>
  new Date(d.getTime() + days * 86_400_000);

/** Calendar date (YYYY-MM-DD) of the instant in Tashkent — grouping/RPC key. */
export function tashkentDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TASHKENT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** UTC ISO instant for the start of the Tashkent calendar month containing d.
 *  Use this to bound "this month" queries — a plain UTC month start is off by
 *  the +5h offset and mis-buckets income/lessons around month boundaries. */
export function tashkentMonthStartUtc(d: Date): string {
  const [year, month] = tashkentDateKey(d).split("-");
  return new Date(`${year}-${month}-01T00:00:00+05:00`).toISOString();
}

/** "14:30" in Tashkent. */
export function formatTime(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(intlTag(locale), {
    timeZone: TASHKENT_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** "Jum" / "пт" — short weekday in Tashkent. */
export function formatWeekdayShort(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(intlTag(locale), {
    timeZone: TASHKENT_TZ,
    weekday: "short",
  }).format(d);
}

/** Day of month in Tashkent, e.g. "13". */
export function tashkentDayNumber(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TASHKENT_TZ,
    day: "numeric",
  }).format(d);
}

/** "13-iyun" / "13 июня" — day + month in Tashkent. */
export function formatDayMonth(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(intlTag(locale), {
    timeZone: TASHKENT_TZ,
    day: "numeric",
    month: "long",
  }).format(d);
}

/** "iyun" / "июн." — short month in Tashkent (compact calendar chips). */
export function formatMonthShort(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(intlTag(locale), {
    timeZone: TASHKENT_TZ,
    month: "short",
  }).format(d);
}

/** "juma, 13-iyun" / "пятница, 13 июня" — full date in Tashkent. */
export function formatFullDate(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(intlTag(locale), {
    timeZone: TASHKENT_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

/** "13-iyun, 2026" / "13 июня 2026 г." — date with year (reviews). */
export function formatDateWithYear(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(intlTag(locale), {
    timeZone: TASHKENT_TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}
