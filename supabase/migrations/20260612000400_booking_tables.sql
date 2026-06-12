-- ============ Bookings, packages, lessons ============

create table bookings (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references profiles(id),
  teacher_id         uuid not null references teacher_profiles(user_id),
  teacher_subject_id uuid not null references teacher_subjects(id),
  kind               booking_kind not null default 'regular',
  status             booking_status not null default 'pending_payment',
  start_at           timestamptz not null,
  duration_min       int not null check (duration_min in (20,30,60,90)),
  price              bigint not null default 0 check (price >= 0),  -- tiyin; 0 for trial_free and package
  student_package_id uuid,                                          -- set when kind='package' (FK added below)
  cancel_reason      text,
  created_at         timestamptz not null default now(),
  check (duration_min <> 20 or kind = 'trial_free'),                -- 20 min only for free trial
  -- double-booking protection: one teacher cannot have overlapping active bookings
  constraint bookings_no_overlap exclude using gist (
    teacher_id with =,
    tstzrange(start_at, start_at + (duration_min || ' minutes')::interval) with &&
  ) where (status in ('pending_payment','paid','in_progress'))
);
create index on bookings (student_id, start_at desc);
create index on bookings (teacher_id, start_at desc);
create index on bookings (status, start_at);

create table student_packages (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references profiles(id),
  teacher_subject_id uuid not null references teacher_subjects(id),
  lessons_total      int not null check (lessons_total in (5,10,20)),
  lessons_left       int not null check (lessons_left >= 0),
  duration_min       int not null check (duration_min in (30,60,90)),
  price_paid         bigint not null check (price_paid > 0),
  expires_at         timestamptz not null,
  created_at         timestamptz not null default now(),
  check (lessons_left <= lessons_total)
);
create index on student_packages (student_id);

alter table bookings
  add constraint bookings_package_fk
  foreign key (student_package_id) references student_packages(id);

create table lessons (
  booking_id      uuid primary key references bookings(id) on delete cascade,
  video_provider  text not null default 'agora',
  channel_name    text not null,            -- = booking_id
  started_at      timestamptz,
  ended_at        timestamptz,
  student_joined  boolean not null default false,
  teacher_joined  boolean not null default false,
  wallet_credited boolean not null default false
);
