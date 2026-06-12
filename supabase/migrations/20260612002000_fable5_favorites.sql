-- ============ Fable5: student favorites (bookmarked teachers) ============
-- Additive only. Students bookmark teachers from catalog/profile; used by
-- "Избранное" sections in mobile and web cabinets.

create table student_favorites (
  student_id uuid not null references profiles(id) on delete cascade,
  teacher_id uuid not null references teacher_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, teacher_id)
);

create index on student_favorites (student_id, created_at desc);

alter table student_favorites enable row level security;

-- mirror the narrow-grant convention from 20260612000900_rls.sql
revoke insert, update, delete on student_favorites from anon, authenticated;
grant insert, delete on student_favorites to authenticated;

create policy student_favorites_select on student_favorites for select using (
  student_id = (select auth.uid())
);
create policy student_favorites_insert on student_favorites for insert with check (
  student_id = (select auth.uid())
);
create policy student_favorites_delete on student_favorites for delete using (
  student_id = (select auth.uid())
);
