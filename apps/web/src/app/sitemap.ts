import type { MetadataRoute } from "next";
import { publicClient } from "@/lib/supabase/public";

const SITE = process.env.APP_BASE_URL ?? "https://ustoz.uz";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = publicClient();

  const [{ data: teachers }, { data: subjects }, { data: categories }] = await Promise.all([
    supabase
      .from("teacher_profiles")
      .select("slug, created_at, moderation_flag, profiles!teacher_profiles_user_id_fkey!inner(is_banned)")
      .eq("moderation_flag", false)
      .eq("profiles.is_banned", false),
    supabase.from("subjects").select("slug").eq("is_active", true),
    supabase.from("categories").select("slug").eq("is_active", true),
  ]);

  const both = (path: string, priority: number): MetadataRoute.Sitemap => [
    {
      url: `${SITE}${path}`,
      priority,
      alternates: { languages: { uz: `${SITE}${path}`, ru: `${SITE}/ru${path}` } },
    },
  ];

  return [
    ...both("", 1),
    ...both("/catalog", 0.9),
    ...both("/become-teacher", 0.8),
    ...(teachers ?? []).flatMap((t) => both(`/t/${t.slug}`, 0.8)),
    ...(subjects ?? []).flatMap((s) => both(`/s/${s.slug}`, 0.7)),
    ...(categories ?? []).flatMap((c) =>
      c.slug ? both(`/catalog?category=${c.slug}`, 0.5) : [],
    ),
  ];
}
