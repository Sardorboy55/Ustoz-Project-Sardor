-- Phase 2: catalog search (pg_trgm) + the catalog_teachers RPC used by
-- both the app and the web catalog (docs/04 §4.2).

-- SEO slugs for category pages /catalog/[slug]
alter table categories add column slug text unique;

-- trigram indexes for fuzzy name/headline/subject search (uz + ru)
create index if not exists profiles_full_name_trgm
  on profiles using gin (full_name gin_trgm_ops);
create index if not exists teacher_profiles_headline_uz_trgm
  on teacher_profiles using gin (headline_uz gin_trgm_ops);
create index if not exists teacher_profiles_headline_ru_trgm
  on teacher_profiles using gin (headline_ru gin_trgm_ops);
create index if not exists subjects_name_uz_trgm
  on subjects using gin (name_uz gin_trgm_ops);
create index if not exists subjects_name_ru_trgm
  on subjects using gin (name_ru gin_trgm_ops);

-- Catalog cards with filters and sorting. Public data only (RLS-readable);
-- banned and moderation-flagged teachers are excluded (docs/04 §4.2).
create or replace function public.catalog_teachers(
  p_query       text    default null,
  p_category_id uuid    default null,
  p_subject_id  uuid    default null,
  p_price_min   bigint  default null,   -- tiyin, compared to price_60
  p_price_max   bigint  default null,
  p_rating_min  numeric default null,
  p_lang        text    default null,   -- teaching language: uz|ru|en
  p_trial_only  boolean default false,
  p_sort        text    default 'recommended',
  p_limit       int     default 20,
  p_offset      int     default 0
) returns table (
  user_id          uuid,
  slug             text,
  full_name        text,
  avatar_url       text,
  headline_uz      text,
  headline_ru      text,
  rating_avg       numeric,
  rating_count     int,
  lessons_done     int,
  tier             subscription_tier,
  is_verified      boolean,
  teaching_langs   text[],
  min_price_60     bigint,
  has_free_trial   boolean,
  subjects_uz      text[],
  subjects_ru      text[],
  total_count      bigint
)
language sql stable set search_path = public as $$
  with cards as (
    select
      tp.user_id,
      tp.slug,
      p.full_name,
      p.avatar_url,
      tp.headline_uz,
      tp.headline_ru,
      tp.rating_avg,
      tp.rating_count,
      tp.lessons_done,
      tp.tier,
      tp.is_verified,
      tp.teaching_langs,
      min(ts.price_60)                       as min_price_60,
      bool_or(ts.trial_free_enabled)         as has_free_trial,
      array_agg(distinct s.name_uz)          as subjects_uz,
      array_agg(distinct s.name_ru)          as subjects_ru,
      -- docs/04: search_boost + rating*10 + ln(lessons+1)*5
      (tp.search_boost + tp.rating_avg * 10 + ln(tp.lessons_done + 1) * 5) as score
    from teacher_profiles tp
    join profiles p          on p.id = tp.user_id
    join teacher_subjects ts on ts.teacher_id = tp.user_id and ts.is_active
    join subjects s          on s.id = ts.subject_id and s.is_active
    where not p.is_banned
      and not tp.moderation_flag
      and (p_category_id is null or s.category_id = p_category_id)
      and (p_subject_id  is null or s.id = p_subject_id)
      and (p_lang is null or p_lang = any(tp.teaching_langs))
      and (not p_trial_only or ts.trial_free_enabled)
      and (
        p_query is null or btrim(p_query) = '' or
        p.full_name     ilike '%' || p_query || '%' or
        tp.headline_uz  ilike '%' || p_query || '%' or
        tp.headline_ru  ilike '%' || p_query || '%' or
        s.name_uz       ilike '%' || p_query || '%' or
        s.name_ru       ilike '%' || p_query || '%' or
        similarity(p.full_name, p_query) > 0.3 or
        similarity(tp.headline_uz, p_query) > 0.2 or
        similarity(tp.headline_ru, p_query) > 0.2
      )
    group by tp.user_id, tp.slug, p.full_name, p.avatar_url, tp.headline_uz,
             tp.headline_ru, tp.rating_avg, tp.rating_count, tp.lessons_done,
             tp.tier, tp.is_verified, tp.teaching_langs, tp.search_boost
    having (p_price_min is null or min(ts.price_60) >= p_price_min)
       and (p_price_max is null or min(ts.price_60) <= p_price_max)
       and (p_rating_min is null or tp.rating_avg >= p_rating_min)
  )
  select
    c.user_id, c.slug, c.full_name, c.avatar_url, c.headline_uz, c.headline_ru,
    c.rating_avg, c.rating_count, c.lessons_done, c.tier, c.is_verified,
    c.teaching_langs, c.min_price_60, c.has_free_trial, c.subjects_uz, c.subjects_ru,
    count(*) over () as total_count
  from cards c
  order by
    case when p_sort = 'price_asc'  then c.min_price_60 end asc,
    case when p_sort = 'price_desc' then c.min_price_60 end desc,
    case when p_sort = 'rating'     then c.rating_avg   end desc,
    case when p_sort not in ('price_asc','price_desc','rating') then c.score end desc,
    c.rating_count desc
  limit greatest(1, least(p_limit, 50))
  offset greatest(0, p_offset)
$$;
