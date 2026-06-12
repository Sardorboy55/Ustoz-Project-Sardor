-- ============ Chat ============

create table chats (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references profiles(id),
  teacher_id      uuid not null references teacher_profiles(user_id),
  last_message_at timestamptz,
  unique (student_id, teacher_id)
);

create table messages (
  id              uuid primary key default gen_random_uuid(),
  chat_id         uuid not null references chats(id) on delete cascade,
  sender_id       uuid not null references profiles(id),
  body            text,                         -- stored ALREADY masked (mask_contacts trigger)
  body_was_masked boolean not null default false,
  file_url        text,
  file_name       text,
  file_size       int,
  created_at      timestamptz not null default now(),
  check (body is not null or file_url is not null)
);
create index on messages (chat_id, created_at desc);

-- ============ Whiteboard ============

-- strokes of a lesson's whiteboard; synced via Realtime
create table whiteboard_strokes (
  id         bigint generated always as identity primary key,
  booking_id uuid not null references bookings(id) on delete cascade,
  author_id  uuid not null references profiles(id),
  payload    jsonb not null,  -- {tool,color,width,points:[[x,y],..]} | {type:'clear'} | {type:'image',url,x,y,w,h}
  created_at timestamptz not null default now()
);
create index on whiteboard_strokes (booking_id, id);

-- ============ Homework & quizzes ============

create table homeworks (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references teacher_profiles(user_id),
  student_id  uuid not null references profiles(id),
  booking_id  uuid references bookings(id),
  title       text not null,
  description text,
  attachments jsonb not null default '[]',      -- [{url,name,size}]
  quiz        jsonb,                            -- {questions:[{q,options:[..],correct:int}]} | null
  due_at      timestamptz,
  status      homework_status not null default 'assigned',
  created_at  timestamptz not null default now()
);
create index on homeworks (student_id, created_at desc);
create index on homeworks (teacher_id, created_at desc);

create table homework_submissions (
  homework_id      uuid primary key references homeworks(id) on delete cascade,
  answer_text      text,
  attachments      jsonb not null default '[]',
  quiz_answers     jsonb,                       -- [int,...]
  quiz_score       int,                         -- auto-graded %
  grade            int check (grade between 1 and 5),
  teacher_feedback text,
  submitted_at     timestamptz not null default now(),
  graded_at        timestamptz
);

-- ============ Reviews & gamification ============

create table reviews (
  booking_id uuid primary key references bookings(id),
  student_id uuid not null references profiles(id),
  teacher_id uuid not null references teacher_profiles(user_id),
  stars      int not null check (stars between 1 and 5),
  body       text,
  is_hidden  boolean not null default false,    -- moderation
  created_at timestamptz not null default now()
);
create index on reviews (teacher_id, created_at desc);

create table gamification (
  user_id            uuid primary key references profiles(id) on delete cascade,
  xp                 int not null default 0,
  level              int not null default 1,
  streak_days        int not null default 0,
  streak_freezes     int not null default 1,
  last_activity_date date
);

create table xp_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references profiles(id),
  kind       text not null,                     -- lesson_done | homework_done | quiz_done | review_left
  xp         int not null,
  ref_id     uuid,
  created_at timestamptz not null default now()
);
create unique index xp_events_idempotency on xp_events (user_id, kind, ref_id) where ref_id is not null;

-- ============ Notifications & settings ============

create table notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  channel      notification_channel not null,
  template     text not null,   -- booking_reminder_24h | booking_reminder_1h | hw_assigned | payout_paid | ...
  payload      jsonb not null default '{}',
  scheduled_at timestamptz not null,
  sent_at      timestamptz,
  read_at      timestamptz
);
create index on notifications (scheduled_at) where sent_at is null;
create index on notifications (user_id, scheduled_at desc);

create table app_settings (
  key   text primary key,
  value jsonb not null
);

-- ============ Admin: audit, moderation, support ============

create table admin_audit_log (
  id         bigint generated always as identity primary key,
  admin_id   uuid not null references profiles(id),
  action     text not null,
  entity     text not null,
  entity_id  text,
  payload    jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on admin_audit_log (created_at desc);

-- profiles/messages caught by the contact filter (3+ hits) — docs/06 §4
create table moderation_queue (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('message','teacher_profile')),
  entity_id   uuid not null,
  reason      text,
  status      text not null default 'pending' check (status in ('pending','approved','hidden','banned')),
  admin_id    uuid references profiles(id),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create index on moderation_queue (status, created_at);

-- support requests from the app (docs/06 §13)
create table support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id),
  subject     text not null,
  body        text not null,
  status      text not null default 'open' check (status in ('open','closed')),
  admin_id    uuid references profiles(id),
  admin_reply text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create index on support_tickets (status, created_at);
