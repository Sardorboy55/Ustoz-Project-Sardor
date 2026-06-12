-- ============ Users & profiles ============

-- profiles: 1:1 with auth.users (created by on_auth_user_created trigger)
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  phone           text unique not null,
  full_name       text not null default '',
  avatar_url      text,
  locale          text not null default 'uz' check (locale in ('uz','ru')),
  is_teacher      boolean not null default false,
  is_admin        boolean not null default false,
  is_banned       boolean not null default false,
  student_balance bigint not null default 0 check (student_balance >= 0), -- tiyin, internal student balance
  fcm_tokens      text[] not null default '{}',
  created_at      timestamptz not null default now()
);

create table teacher_profiles (
  user_id          uuid primary key references profiles(id) on delete cascade,
  slug             text unique not null,              -- SEO URL /t/[slug]
  headline_uz      text not null default '',
  headline_ru      text not null default '',
  bio_uz           text not null default '',
  bio_ru           text not null default '',
  intro_video_url  text,
  experience_years int not null default 0 check (experience_years between 0 and 80),
  teaching_langs   text[] not null default '{uz,ru}', -- languages the teacher teaches in
  is_verified      boolean not null default false,    -- badge, always false in MVP
  tier             subscription_tier not null default 'free',
  tier_expires_at  timestamptz,
  rating_avg       numeric(3,2) not null default 0,
  rating_count     int not null default 0,
  lessons_done     int not null default 0,
  cancel_strikes   int not null default 0,            -- cancellations in last 30 days (cron recalculates)
  search_boost     int not null default 0,            -- pro=100 (app_settings)
  moderation_flag  boolean not null default false,    -- contact filter tripped on profile text
  created_at       timestamptz not null default now()
);

-- ============ Catalog ============

create table categories (
  id        uuid primary key default gen_random_uuid(),
  name_uz   text not null,
  name_ru   text not null,
  icon      text,
  sort      int not null default 0,
  is_active boolean not null default true
);

create table subjects (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id),
  name_uz     text not null,
  name_ru     text not null,
  slug        text unique not null,
  is_active   boolean not null default true
);
create index on subjects (category_id);

-- teacher's subjects with prices (tiyin)
create table teacher_subjects (
  id                 uuid primary key default gen_random_uuid(),
  teacher_id         uuid not null references teacher_profiles(user_id) on delete cascade,
  subject_id         uuid not null references subjects(id),
  price_30           bigint check (price_30 is null or price_30 > 0),
  price_60           bigint not null check (price_60 > 0),
  price_90           bigint check (price_90 is null or price_90 > 0),
  trial_free_enabled boolean not null default false,  -- free 20-min trial
  trial_discount_pct int not null default 0 check (trial_discount_pct between 0 and 90),
  pkg5_discount_pct  int not null default 0 check (pkg5_discount_pct  between 0 and 90),
  pkg10_discount_pct int not null default 0 check (pkg10_discount_pct between 0 and 90),
  pkg20_discount_pct int not null default 0 check (pkg20_discount_pct between 0 and 90),
  is_active          boolean not null default true,
  unique (teacher_id, subject_id)
);
create index on teacher_subjects (subject_id) where is_active;

-- ============ Schedule ============

-- recurring weekly availability; minutes from midnight Asia/Tashkent
create table availability_rules (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teacher_profiles(user_id) on delete cascade,
  weekday    int not null check (weekday between 0 and 6),   -- 0=Sunday
  start_min  int not null check (start_min between 0 and 1410),
  end_min    int not null check (end_min between 30 and 1440),
  check (start_min < end_min and start_min % 30 = 0 and end_min % 30 = 0)
);
create index on availability_rules (teacher_id, weekday);

-- exceptions: vacation / blocked dates
create table availability_exceptions (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teacher_profiles(user_id) on delete cascade,
  date       date not null,
  start_min  int check (start_min is null or (start_min between 0 and 1410 and start_min % 30 = 0)),
  end_min    int check (end_min is null or (end_min between 30 and 1440 and end_min % 30 = 0)),
  check ((start_min is null) = (end_min is null)),           -- both null = whole day closed
  check (start_min is null or start_min < end_min)
);
create index on availability_exceptions (teacher_id, date);
