# 03 — Схема базы данных (PostgreSQL / Supabase)

Деньги хранятся в **тийинах** (integer). Все timestamp — `timestamptz` (UTC). RLS включён на всех таблицах; ниже после схемы — паттерны политик.

## Enums

```sql
create type user_role as enum ('student','teacher','admin');
create type subscription_tier as enum ('free','pro');
create type booking_status as enum (
  'pending_payment','paid','in_progress','completed',
  'cancelled_by_student','cancelled_by_teacher','no_show_student','no_show_teacher','expired'
);
create type booking_kind as enum ('regular','trial_free','trial_discount','package');
create type payment_provider as enum ('payme','click','uzum','internal_balance');
create type payment_status as enum ('created','pending','succeeded','failed','refunded');
create type wallet_tx_type as enum (
  'lesson_income','payout','payout_freeze','payout_unfreeze',
  'refund_in','booking_spend','admin_adjust'
);
create type payout_status as enum ('pending','approved','paid','rejected');
create type homework_status as enum ('assigned','submitted','graded');
create type notification_channel as enum ('push','sms');
```

## Пользователи и профили

```sql
-- profiles: 1:1 c auth.users
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  phone         text unique not null,
  full_name     text not null default '',
  avatar_url    text,
  locale        text not null default 'uz' check (locale in ('uz','ru')),
  is_teacher    boolean not null default false,
  is_admin      boolean not null default false,
  is_banned     boolean not null default false,
  student_balance bigint not null default 0 check (student_balance >= 0), -- тийины, внутренний баланс ученика
  fcm_tokens    text[] not null default '{}',
  created_at    timestamptz not null default now()
);

create table teacher_profiles (
  user_id        uuid primary key references profiles(id) on delete cascade,
  slug           text unique not null,             -- для SEO-URL /t/[slug]
  headline_uz    text default '', headline_ru text default '',
  bio_uz         text default '', bio_ru      text default '',
  intro_video_url text,
  experience_years int default 0,
  teaching_langs text[] not null default '{uz,ru}', -- на каких языках ведёт
  is_verified    boolean not null default false,    -- бейдж, в MVP всегда false
  tier           subscription_tier not null default 'free',
  tier_expires_at timestamptz,
  rating_avg     numeric(3,2) not null default 0,
  rating_count   int not null default 0,
  lessons_done   int not null default 0,
  cancel_strikes int not null default 0,            -- отмены за 30 дней (cron пересчитывает)
  search_boost   int not null default 0,            -- pro=100, настройка
  moderation_flag boolean not null default false,   -- сработал контакт-фильтр в профиле
  created_at     timestamptz not null default now()
);
```

## Каталог

```sql
create table categories (
  id uuid primary key default gen_random_uuid(),
  name_uz text not null, name_ru text not null,
  icon text, sort int not null default 0, is_active boolean not null default true
);

create table subjects (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id),
  name_uz text not null, name_ru text not null,
  slug text unique not null, is_active boolean not null default true
);

-- предметы преподавателя с ценами (тийины)
create table teacher_subjects (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teacher_profiles(user_id) on delete cascade,
  subject_id uuid not null references subjects(id),
  price_30 bigint, price_60 bigint not null, price_90 bigint,
  trial_free_enabled boolean not null default false,      -- бесплатный пробный 20 мин
  trial_discount_pct int not null default 0 check (trial_discount_pct between 0 and 90),
  pkg5_discount_pct  int not null default 0,
  pkg10_discount_pct int not null default 0,
  pkg20_discount_pct int not null default 0,
  is_active boolean not null default true,
  unique (teacher_id, subject_id)
);
```

## Расписание

```sql
-- повторяющаяся недельная доступность; время — минуты от полуночи по Asia/Tashkent
create table availability_rules (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teacher_profiles(user_id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),    -- 0=вс
  start_min int not null, end_min int not null,
  check (start_min < end_min and start_min % 30 = 0 and end_min % 30 = 0)
);

-- исключения: отпуск/блокировка конкретных дат
create table availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teacher_profiles(user_id) on delete cascade,
  date date not null,
  start_min int, end_min int          -- null = весь день закрыт
);
```

Свободные слоты вычисляются: правила − исключения − существующие брони (`status in ('pending_payment','paid','in_progress')`). Функция `get_free_slots(teacher_id, from_date, to_date, duration_min)` возвращает массив слотов — используется и приложением, и сайтом.

## Брони, пакеты, уроки

```sql
create table bookings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id),
  teacher_id uuid not null references teacher_profiles(user_id),
  teacher_subject_id uuid not null references teacher_subjects(id),
  kind booking_kind not null default 'regular',
  status booking_status not null default 'pending_payment',
  start_at timestamptz not null,
  duration_min int not null check (duration_min in (20,30,60,90)), -- 20 только для trial_free
  price bigint not null default 0,                  -- тийины; 0 для trial_free и package
  student_package_id uuid,                          -- если kind='package'
  cancel_reason text,
  created_at timestamptz not null default now(),
  -- защита от двойного бронирования слота:
  exclude using gist (
    teacher_id with =,
    tstzrange(start_at, start_at + (duration_min || ' minutes')::interval) with &&
  ) where (status in ('pending_payment','paid','in_progress'))
);
create index on bookings (student_id, start_at desc);
create index on bookings (teacher_id, start_at desc);

create table student_packages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id),
  teacher_subject_id uuid not null references teacher_subjects(id),
  lessons_total int not null, lessons_left int not null,
  duration_min int not null,
  price_paid bigint not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table lessons (
  booking_id uuid primary key references bookings(id) on delete cascade,
  video_provider text not null default 'agora',
  channel_name text not null,           -- = booking_id
  started_at timestamptz, ended_at timestamptz,
  student_joined boolean not null default false,
  teacher_joined boolean not null default false,
  wallet_credited boolean not null default false
);
```

`pending_payment` живёт 15 минут (cron переводит в `expired`, слот освобождается).

## Платежи и деньги

```sql
create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  booking_id uuid references bookings(id),
  package_id uuid references student_packages(id),
  subscription boolean not null default false,       -- оплата PRO
  provider payment_provider not null,
  amount bigint not null,
  status payment_status not null default 'created',
  external_id text,                                  -- id транзакции платёжки
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  unique (provider, external_id)                     -- идемпотентность вебхуков
);

create table wallets (
  teacher_id uuid primary key references teacher_profiles(user_id),
  balance bigint not null default 0 check (balance >= 0),
  frozen  bigint not null default 0 check (frozen  >= 0)
);

create table wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references wallets(teacher_id),
  type wallet_tx_type not null,
  amount bigint not null,                            -- + приход, − расход
  booking_id uuid references bookings(id),
  payout_id uuid,
  comment text,
  created_at timestamptz not null default now()
);

create table payout_requests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teacher_profiles(user_id),
  amount bigint not null check (amount > 0),
  card_number text not null,                         -- Humo/Uzcard, хранить маскированно после выплаты
  status payout_status not null default 'pending',
  admin_id uuid references profiles(id),
  admin_comment text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
```

**Правило:** баланс меняется только функциями `wallet_credit_lesson(booking_id)`, `wallet_request_payout(...)`, `wallet_resolve_payout(...)`, `student_balance_refund(...)` — все `SECURITY DEFINER`, в транзакции вставляют `wallet_transactions` и обновляют агрегат.

## Подписки

```sql
create table subscription_payments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teacher_profiles(user_id),
  payment_id uuid not null references payments(id),
  period_start date not null, period_end date not null,
  created_at timestamptz not null default now()
);
-- активность PRO = teacher_profiles.tier='pro' and tier_expires_at > now()
```

## Чат

```sql
create table chats (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id),
  teacher_id uuid not null references teacher_profiles(user_id),
  last_message_at timestamptz,
  unique (student_id, teacher_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text,                          -- хранится УЖЕ замаскированный текст
  body_was_masked boolean not null default false,
  file_url text, file_name text, file_size int,
  created_at timestamptz not null default now()
);
create index on messages (chat_id, created_at desc);
```

Realtime-подписка на `messages` по `chat_id`. Маскировка контактов — Postgres-функция `mask_contacts(text)` (regex: телефоны, t.me, @handle, instagram, http-ссылки кроме доменов платформы), вызывается в insert-триггере.

## Доска (whiteboard)

```sql
-- штрихи доски конкретного урока; синхронизация через Realtime
create table whiteboard_strokes (
  id bigint generated always as identity primary key,
  booking_id uuid not null references bookings(id) on delete cascade,
  author_id uuid not null references profiles(id),
  payload jsonb not null,   -- {tool, color, width, points:[[x,y],...]} | {type:'clear'} | {type:'image', url}
  created_at timestamptz not null default now()
);
create index on whiteboard_strokes (booking_id, id);
```

## Домашние задания и тесты

```sql
create table homeworks (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teacher_profiles(user_id),
  student_id uuid not null references profiles(id),
  booking_id uuid references bookings(id),
  title text not null,
  description text,
  attachments jsonb not null default '[]',          -- [{url,name,size}]
  quiz jsonb,    -- {questions:[{q, options:[..], correct:int}]} | null
  due_at timestamptz,
  status homework_status not null default 'assigned',
  created_at timestamptz not null default now()
);

create table homework_submissions (
  homework_id uuid primary key references homeworks(id) on delete cascade,
  answer_text text,
  attachments jsonb not null default '[]',
  quiz_answers jsonb,                                -- [int,...]
  quiz_score int,                                    -- автопроверка
  grade int check (grade between 1 and 5),
  teacher_feedback text,
  submitted_at timestamptz not null default now(),
  graded_at timestamptz
);
```

## Отзывы и геймификация

```sql
create table reviews (
  booking_id uuid primary key references bookings(id),
  student_id uuid not null references profiles(id),
  teacher_id uuid not null references teacher_profiles(user_id),
  stars int not null check (stars between 1 and 5),
  body text,
  is_hidden boolean not null default false,          -- модерация
  created_at timestamptz not null default now()
);
-- триггер: пересчёт teacher_profiles.rating_avg/rating_count

create table gamification (
  user_id uuid primary key references profiles(id) on delete cascade,
  xp int not null default 0,
  level int not null default 1,
  streak_days int not null default 0,
  streak_freezes int not null default 1,
  last_activity_date date
);

create table xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id),
  kind text not null,            -- lesson_done | homework_done | quiz_done | review_left
  xp int not null,
  ref_id uuid,
  created_at timestamptz not null default now()
);
```

## Уведомления и настройки

```sql
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  channel notification_channel not null,
  template text not null,        -- booking_reminder_24h | booking_reminder_1h | hw_assigned | payout_paid | ...
  payload jsonb not null default '{}',
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  read_at timestamptz
);
create index on notifications (scheduled_at) where sent_at is null;

create table app_settings (
  key text primary key,
  value jsonb not null
);
-- seed: pro_price, free_monthly_lessons_limit=10, cancel_window_hours=12,
--       payout_hold_hours=24, chat_masking_enabled=true, package_ttl_months=6,
--       xp_rules, level_thresholds, pro_search_boost=100
```

## Паттерны RLS (применить ко всем таблицам)

```sql
alter table bookings enable row level security;

-- участник видит свои брони
create policy bookings_select on bookings for select
  using (auth.uid() = student_id or auth.uid() = teacher_id or is_admin());

-- создание брони только Edge Function'ом (service role) — у клиентов нет insert-политики

-- профили преподавателей публичны на чтение
create policy teacher_public on teacher_profiles for select using (true);

-- свои данные редактирует владелец
create policy teacher_update on teacher_profiles for update using (auth.uid() = user_id);

-- helper
create function is_admin() returns boolean language sql stable as
  $$ select coalesce((select is_admin from profiles where id = auth.uid()), false) $$;
```

Деньги (`wallets`, `wallet_transactions`, `payments`): select — владелец/админ; insert/update — никому (только SECURITY DEFINER функции и service role).
