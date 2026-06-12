-- ============ RLS on every table ============
-- Clients (anon/authenticated) get row access via policies below; column-level
-- writes are limited with GRANTs. All other writes go through SECURITY DEFINER
-- functions or Edge Functions with the service role.

alter table profiles                     enable row level security;
alter table teacher_profiles             enable row level security;
alter table categories                   enable row level security;
alter table subjects                     enable row level security;
alter table teacher_subjects             enable row level security;
alter table availability_rules           enable row level security;
alter table availability_exceptions      enable row level security;
alter table bookings                     enable row level security;
alter table student_packages             enable row level security;
alter table lessons                      enable row level security;
alter table payments                     enable row level security;
alter table wallets                      enable row level security;
alter table wallet_transactions          enable row level security;
alter table student_balance_transactions enable row level security;
alter table payout_requests              enable row level security;
alter table subscription_payments        enable row level security;
alter table chats                        enable row level security;
alter table messages                     enable row level security;
alter table whiteboard_strokes           enable row level security;
alter table homeworks                    enable row level security;
alter table homework_submissions         enable row level security;
alter table reviews                      enable row level security;
alter table gamification                 enable row level security;
alter table xp_events                    enable row level security;
alter table notifications                enable row level security;
alter table app_settings                 enable row level security;
alter table admin_audit_log              enable row level security;
alter table moderation_queue             enable row level security;
alter table support_tickets              enable row level security;

-- ============ Reset write grants, re-grant narrowly ============

revoke insert, update, delete on all tables in schema public from anon, authenticated;

-- user self-service columns
grant update (full_name, avatar_url, locale, fcm_tokens) on profiles to authenticated;
grant update (headline_uz, headline_ru, bio_uz, bio_ru, intro_video_url,
              experience_years, teaching_langs) on teacher_profiles to authenticated;
grant insert, update, delete on teacher_subjects        to authenticated;
grant insert, update, delete on availability_rules      to authenticated;
grant insert, update, delete on availability_exceptions to authenticated;
grant insert on chats                to authenticated;
grant insert on messages             to authenticated;
grant insert on whiteboard_strokes   to authenticated;
grant insert, update on homeworks    to authenticated;
grant insert on homework_submissions to authenticated;
grant insert on reviews              to authenticated;
grant insert on support_tickets      to authenticated;
grant update (read_at) on notifications to authenticated;

-- ============ Policies ============

-- profiles: own row; admins; teachers are public (catalog cards); a teacher sees their students
create policy profiles_select on profiles for select using (
  id = (select auth.uid())
  or is_admin()
  or is_teacher
  or exists (select 1 from bookings b
             where b.student_id = profiles.id and b.teacher_id = (select auth.uid()))
  or exists (select 1 from chats c
             where c.student_id = profiles.id and c.teacher_id = (select auth.uid()))
);
create policy profiles_update on profiles for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- teacher_profiles: public read; owner edits text fields (columns limited by grant)
create policy teacher_profiles_select on teacher_profiles for select using (true);
create policy teacher_profiles_update on teacher_profiles for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- catalog: active rows public; admins see all (writes via service role)
create policy categories_select on categories for select using (is_active or is_admin());
create policy subjects_select   on subjects   for select using (is_active or is_admin());

-- teacher_subjects: public read (prices on profile), owner manages
create policy teacher_subjects_select on teacher_subjects for select using (true);
create policy teacher_subjects_insert on teacher_subjects for insert
  with check (teacher_id = (select auth.uid()));
create policy teacher_subjects_update on teacher_subjects for update
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));
create policy teacher_subjects_delete on teacher_subjects for delete
  using (teacher_id = (select auth.uid()));

-- availability: public read (slot calendars), owner manages
create policy availability_rules_select on availability_rules for select using (true);
create policy availability_rules_insert on availability_rules for insert
  with check (teacher_id = (select auth.uid()));
create policy availability_rules_update on availability_rules for update
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));
create policy availability_rules_delete on availability_rules for delete
  using (teacher_id = (select auth.uid()));

create policy availability_exceptions_select on availability_exceptions for select using (true);
create policy availability_exceptions_insert on availability_exceptions for insert
  with check (teacher_id = (select auth.uid()));
create policy availability_exceptions_update on availability_exceptions for update
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));
create policy availability_exceptions_delete on availability_exceptions for delete
  using (teacher_id = (select auth.uid()));

-- bookings: participants and admins read; all writes via Edge Functions (service role)
create policy bookings_select on bookings for select using (
  student_id = (select auth.uid()) or teacher_id = (select auth.uid()) or is_admin()
);

-- packages: owner, the teacher they belong to, admins
create policy student_packages_select on student_packages for select using (
  student_id = (select auth.uid())
  or exists (select 1 from teacher_subjects ts
             where ts.id = student_packages.teacher_subject_id
               and ts.teacher_id = (select auth.uid()))
  or is_admin()
);

-- lessons: booking participants
create policy lessons_select on lessons for select using (
  is_booking_participant(booking_id) or is_admin()
);

-- money: owner reads, nobody writes directly
create policy payments_select on payments for select using (
  user_id = (select auth.uid()) or is_admin()
);
create policy wallets_select on wallets for select using (
  teacher_id = (select auth.uid()) or is_admin()
);
create policy wallet_transactions_select on wallet_transactions for select using (
  teacher_id = (select auth.uid()) or is_admin()
);
create policy student_balance_tx_select on student_balance_transactions for select using (
  student_id = (select auth.uid()) or is_admin()
);
create policy payout_requests_select on payout_requests for select using (
  teacher_id = (select auth.uid()) or is_admin()
);
create policy subscription_payments_select on subscription_payments for select using (
  teacher_id = (select auth.uid()) or is_admin()
);

-- chats: participants; student initiates
create policy chats_select on chats for select using (
  student_id = (select auth.uid()) or teacher_id = (select auth.uid()) or is_admin()
);
create policy chats_insert on chats for insert
  with check (student_id = (select auth.uid()));

-- messages: chat participants; sender is the author
create policy messages_select on messages for select using (
  exists (select 1 from chats c
          where c.id = messages.chat_id
            and (c.student_id = (select auth.uid()) or c.teacher_id = (select auth.uid())))
  or is_admin()
);
create policy messages_insert on messages for insert with check (
  sender_id = (select auth.uid())
  and exists (select 1 from chats c
              where c.id = messages.chat_id
                and (c.student_id = (select auth.uid()) or c.teacher_id = (select auth.uid())))
);

-- whiteboard: booking participants
create policy whiteboard_select on whiteboard_strokes for select using (
  is_booking_participant(booking_id) or is_admin()
);
create policy whiteboard_insert on whiteboard_strokes for insert with check (
  author_id = (select auth.uid()) and is_booking_participant(booking_id)
);

-- homework: teacher assigns to their students, both read
create policy homeworks_select on homeworks for select using (
  teacher_id = (select auth.uid()) or student_id = (select auth.uid()) or is_admin()
);
create policy homeworks_insert on homeworks for insert with check (
  teacher_id = (select auth.uid())
  and exists (select 1 from bookings b
              where b.teacher_id = (select auth.uid())
                and b.student_id = homeworks.student_id)
);
create policy homeworks_update on homeworks for update
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

create policy homework_submissions_select on homework_submissions for select using (
  exists (select 1 from homeworks h
          where h.id = homework_submissions.homework_id
            and (h.teacher_id = (select auth.uid()) or h.student_id = (select auth.uid())))
  or is_admin()
);
create policy homework_submissions_insert on homework_submissions for insert with check (
  exists (select 1 from homeworks h
          where h.id = homework_submissions.homework_id
            and h.student_id = (select auth.uid()))
);

-- reviews: public unless hidden; author must own a completed booking with that teacher
create policy reviews_select on reviews for select using (
  not is_hidden
  or student_id = (select auth.uid())
  or teacher_id = (select auth.uid())
  or is_admin()
);
create policy reviews_insert on reviews for insert with check (
  student_id = (select auth.uid())
  and exists (select 1 from bookings b
              where b.id = reviews.booking_id
                and b.student_id = (select auth.uid())
                and b.teacher_id = reviews.teacher_id
                and b.status = 'completed')
);

-- gamification: own data
create policy gamification_select on gamification for select using (
  user_id = (select auth.uid()) or is_admin()
);
create policy xp_events_select on xp_events for select using (
  user_id = (select auth.uid()) or is_admin()
);

-- notifications: own; user can only mark as read (column grant)
create policy notifications_select on notifications for select using (
  user_id = (select auth.uid()) or is_admin()
);
create policy notifications_update on notifications for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- settings: public read, service-role writes
create policy app_settings_select on app_settings for select using (true);

-- admin-only tables
create policy admin_audit_log_select on admin_audit_log for select using (is_admin());
create policy moderation_queue_select on moderation_queue for select using (is_admin());

-- support: user files and reads own tickets, admin handles them
create policy support_tickets_select on support_tickets for select using (
  user_id = (select auth.uid()) or is_admin()
);
create policy support_tickets_insert on support_tickets for insert with check (
  user_id = (select auth.uid())
);

-- ============ Realtime publication ============
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table chats;
alter publication supabase_realtime add table whiteboard_strokes;
alter publication supabase_realtime add table bookings;
alter publication supabase_realtime add table notifications;
