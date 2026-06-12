export type ClassValue = string | false | null | undefined;

/** Tiny class-name joiner (no clsx dependency). */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
