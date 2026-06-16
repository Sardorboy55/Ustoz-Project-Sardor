-- Lessons happen on an EXTERNAL meeting link (Google Meet), not built-in video.
-- Flow (decided with the owner):
--   1. Student books + pays at booking time (unchanged) → status 'paid'.
--   2. Teacher attaches a Google Meet link to the booking (lesson_set_meeting_url).
--   3. At start_at the lesson is "active"; both open the link. The on-screen
--      timer counts up from start_at (the teacher ends when done — Meet-style).
--   4. Teacher presses "Complete" (lesson_complete) → status 'completed' and the
--      teacher's wallet is credited via the existing idempotent wallet_credit_lesson.
-- Additive: one column + two SECURITY DEFINER RPCs (auth checked inside).

alter table lessons add column if not exists meeting_url text;

-- Teacher attaches/updates the meeting link for their own upcoming/active booking.
create or replace function public.lesson_set_meeting_url(p_booking_id uuid, p_url text)
returns void language plpgsql security definer set search_path = public as $$
declare
  b bookings%rowtype;
begin
  if coalesce(trim(p_url), '') = '' then raise exception 'URL_REQUIRED'; end if;
  if p_url !~* '^https?://' then raise exception 'INVALID_URL'; end if;

  select * into b from bookings where id = p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if b.teacher_id <> auth.uid() then raise exception 'FORBIDDEN'; end if;
  if b.status not in ('paid', 'in_progress') then raise exception 'NOT_ACTIVE'; end if;

  insert into lessons (booking_id, channel_name, video_provider, meeting_url)
    values (p_booking_id, p_booking_id::text, 'google_meet', trim(p_url))
  on conflict (booking_id) do update
    set meeting_url = excluded.meeting_url, video_provider = 'google_meet';
end $$;

-- Teacher completes the lesson → marks it done and credits the wallet.
-- wallet_credit_lesson is idempotent and only credits a 'completed' booking, so
-- we set the status first; for a free trial (price 0) it credits nothing but
-- still marks the lesson done.
create or replace function public.lesson_complete(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  b bookings%rowtype;
begin
  select * into b from bookings where id = p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if b.teacher_id <> auth.uid() then raise exception 'FORBIDDEN'; end if;
  if b.status not in ('paid', 'in_progress') then raise exception 'NOT_ACTIVE'; end if;
  if now() < b.start_at then raise exception 'NOT_STARTED'; end if;

  -- ensure a lessons row exists and stamp the end time
  insert into lessons (booking_id, channel_name, video_provider, ended_at)
    values (p_booking_id, p_booking_id::text, 'google_meet', now())
  on conflict (booking_id) do update set ended_at = now();

  update bookings set status = 'completed' where id = p_booking_id;
  perform public.wallet_credit_lesson(p_booking_id);
end $$;

-- User-facing RPCs: authenticated only (internal checks enforce teacher ownership).
revoke execute on function public.lesson_set_meeting_url(uuid, text) from public, anon;
revoke execute on function public.lesson_complete(uuid) from public, anon;
grant execute on function public.lesson_set_meeting_url(uuid, text) to authenticated;
grant execute on function public.lesson_complete(uuid) to authenticated;
