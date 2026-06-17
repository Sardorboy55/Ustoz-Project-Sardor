import { publicClient } from "./supabase/public";

export type CatalogCard = {
  user_id: string;
  slug: string;
  full_name: string;
  avatar_url: string | null;
  headline_uz: string;
  headline_ru: string;
  rating_avg: number;
  rating_count: number;
  lessons_done: number;
  tier: "free" | "pro";
  is_verified: boolean;
  teaching_langs: string[];
  min_price_60: number;
  has_free_trial: boolean;
  subjects_uz: string[];
  subjects_ru: string[];
  total_count: number;
};

export type CatalogFilters = {
  query?: string;
  categoryId?: string;
  subjectId?: string;
  priceMin?: number; // UZS
  priceMax?: number; // UZS
  ratingMin?: number;
  lang?: string;
  trialOnly?: boolean;
  sort?: "recommended" | "price_asc" | "price_desc" | "rating";
  page?: number;
  perPage?: number;
};

export async function fetchCatalog(filters: CatalogFilters): Promise<CatalogCard[]> {
  const supabase = publicClient();
  const perPage = filters.perPage ?? 20;
  const { data, error } = await supabase.rpc("catalog_teachers", {
    p_query: filters.query ?? null,
    p_category_id: filters.categoryId ?? null,
    p_subject_id: filters.subjectId ?? null,
    p_price_min: filters.priceMin ? filters.priceMin * 100 : null, // UZS → tiyin
    p_price_max: filters.priceMax ? filters.priceMax * 100 : null,
    p_rating_min: filters.ratingMin ?? null,
    p_lang: filters.lang ?? null,
    p_trial_only: filters.trialOnly ?? false,
    p_sort: filters.sort ?? "recommended",
    p_limit: perPage,
    p_offset: ((filters.page ?? 1) - 1) * perPage,
  });
  if (error) throw error;
  return (data ?? []) as CatalogCard[];
}

/** intro_video_url for a set of teachers, keyed by user_id (public read). */
export async function fetchTeacherVideos(
  userIds: string[],
): Promise<Record<string, string | null>> {
  if (userIds.length === 0) return {};
  const { data } = await publicClient()
    .from("teacher_profiles")
    .select("user_id, intro_video_url")
    .in("user_id", userIds);
  return Object.fromEntries(
    (data ?? []).map((r) => [
      r.user_id as string,
      (r.intro_video_url as string | null) ?? null,
    ]),
  );
}

/** Weekdays (0=Sun..6=Sat) a teacher has any availability window — public read. */
export async function fetchAvailabilityDays(teacherId: string): Promise<number[]> {
  const { data } = await publicClient()
    .from("availability_rules")
    .select("weekday")
    .eq("teacher_id", teacherId);
  return [...new Set((data ?? []).map((r) => r.weekday as number))];
}

/** Teacher-authored FAQ ({q, a}[]) for the public profile. Tolerates the column
 *  being absent (returns []) before the migration is applied. */
export async function fetchTeacherFaq(
  teacherId: string,
): Promise<Array<{ q: string; a: string }>> {
  const { data } = await publicClient()
    .from("teacher_profiles")
    .select("faq")
    .eq("user_id", teacherId)
    .maybeSingle();
  const faq = (data as { faq?: unknown } | null)?.faq;
  return Array.isArray(faq)
    ? (faq as Array<{ q: string; a: string }>).filter((x) => x?.q && x?.a)
    : [];
}

/** bio_uz / bio_ru for a set of teachers, keyed by user_id (public read). */
export async function fetchTeacherBios(
  userIds: string[],
): Promise<Record<string, { uz: string; ru: string }>> {
  if (userIds.length === 0) return {};
  const { data } = await publicClient()
    .from("teacher_profiles")
    .select("user_id, bio_uz, bio_ru")
    .in("user_id", userIds);
  return Object.fromEntries(
    (data ?? []).map((r) => [
      r.user_id as string,
      { uz: (r.bio_uz as string) ?? "", ru: (r.bio_ru as string) ?? "" },
    ]),
  );
}

export async function fetchCategories() {
  const { data } = await publicClient()
    .from("categories")
    .select("id, slug, name_uz, name_ru, icon, sort")
    .eq("is_active", true)
    .order("sort", { ascending: true });
  return data ?? [];
}

export async function fetchSubjects(categoryId?: string) {
  let q = publicClient()
    .from("subjects")
    .select("id, slug, name_uz, name_ru, category_id")
    .eq("is_active", true)
    .order("name_uz", { ascending: true });
  if (categoryId) q = q.eq("category_id", categoryId);
  const { data } = await q;
  return data ?? [];
}

export type TeacherPublic = {
  user_id: string;
  slug: string;
  headline_uz: string;
  headline_ru: string;
  bio_uz: string;
  bio_ru: string;
  intro_video_url: string | null;
  intro_video_poster_url: string | null;
  experience_years: number;
  teaching_langs: string[];
  is_verified: boolean;
  tier: "free" | "pro";
  rating_avg: number;
  rating_count: number;
  lessons_done: number;
  profiles: { full_name: string; avatar_url: string | null } | null;
  teacher_subjects: Array<{
    id: string;
    price_30: number | null;
    price_60: number;
    price_90: number | null;
    trial_free_enabled: boolean;
    trial_discount_pct: number;
    pkg5_discount_pct: number;
    pkg10_discount_pct: number;
    pkg20_discount_pct: number;
    is_active: boolean;
    subjects: { id: string; name_uz: string; name_ru: string; slug: string } | null;
  }>;
};

export async function fetchTeacherBySlug(slug: string): Promise<TeacherPublic | null> {
  const query = () =>
    publicClient()
      .from("teacher_profiles")
      .select(
        `user_id, slug, headline_uz, headline_ru, bio_uz, bio_ru, intro_video_url,
         intro_video_poster_url,
         experience_years, teaching_langs, is_verified, tier, rating_avg, rating_count,
         lessons_done,
         profiles!teacher_profiles_user_id_fkey ( full_name, avatar_url ),
         teacher_subjects ( id, price_30, price_60, price_90, trial_free_enabled,
                            trial_discount_pct, pkg5_discount_pct, pkg10_discount_pct,
                            pkg20_discount_pct, is_active,
                            subjects ( id, name_uz, name_ru, slug ) )`,
      )
      .eq("slug", slug)
      .maybeSingle();

  let { data, error } = await query();
  if (error) {
    // Transient failure (Supabase cold-start / network blip) — retry once, then
    // surface the real error instead of masquerading as a 404 (data === null).
    ({ data, error } = await query());
    if (error) throw error;
  }
  return data as unknown as TeacherPublic | null;
}

export type TeacherReview = {
  booking_id: string;
  stars: number;
  body: string | null;
  created_at: string;
};

/** Public (non-hidden) reviews. RLS hides author names — render anonymously. */
export async function fetchTeacherReviews(
  teacherId: string,
  limit = 10,
): Promise<TeacherReview[]> {
  const { data, error } = await publicClient()
    .from("reviews")
    .select("booking_id, stars, body, created_at")
    .eq("teacher_id", teacherId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as TeacherReview[];
}

/** Teachers of the same subject, excluding the current profile. */
export async function fetchSimilarTeachers(
  subjectId: string,
  excludeUserId: string,
  limit = 3,
): Promise<CatalogCard[]> {
  const cards = await fetchCatalog({ subjectId, perPage: limit + 1 });
  const sameSubject = cards
    .filter((c) => c.user_id !== excludeUserId)
    .slice(0, limit);
  if (sameSubject.length > 0) return sameSubject;
  // Fallback: show other teachers so the "similar" block is never empty.
  const any = await fetchCatalog({ perPage: limit + 1 });
  return any.filter((c) => c.user_id !== excludeUserId).slice(0, limit);
}

export async function fetchSubjectBySlug(slug: string) {
  const query = () =>
    publicClient()
      .from("subjects")
      .select("id, slug, name_uz, name_ru, category_id")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

  let { data, error } = await query();
  if (error) {
    // Retry once on a transient failure, then surface it rather than 404-ing.
    ({ data, error } = await query());
    if (error) throw error;
  }
  return data;
}
