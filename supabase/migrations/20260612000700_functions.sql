-- ============ Helpers ============

-- read scalar settings with a default
create or replace function public.setting_int(p_key text, p_default int)
returns int language sql stable set search_path = public as $$
  select coalesce((select (value #>> '{}')::int from app_settings where key = p_key), p_default)
$$;

create or replace function public.setting_bigint(p_key text, p_default bigint)
returns bigint language sql stable set search_path = public as $$
  select coalesce((select (value #>> '{}')::bigint from app_settings where key = p_key), p_default)
$$;

create or replace function public.setting_bool(p_key text, p_default boolean)
returns boolean language sql stable set search_path = public as $$
  select coalesce((select (value #>> '{}')::boolean from app_settings where key = p_key), p_default)
$$;

-- SECURITY DEFINER so RLS policies can call it without recursing into profiles policies
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false)
$$;

create or replace function public.is_booking_participant(p_booking_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from bookings b
    where b.id = p_booking_id and (b.student_id = auth.uid() or b.teacher_id = auth.uid())
  )
$$;

-- ============ Contact masking (anti-bypass) ============

-- Masks phones, telegram/instagram links, @handles and foreign URLs with [скрыто].
-- Returns the masked text and the number of hits.
create or replace function public.mask_contacts(p_text text, out masked text, out hits int)
language plpgsql immutable as $$
declare
  v_label   constant text := '[скрыто]';
  v_url     text;
  v_count   int;
  v_pattern text;
  v_simple_patterns text[] := array[
    -- UZ phone numbers: +998 .. / 998 .. with separators
    '\+?998[\s\-\(\)\.]*\d(?:[\s\-\(\)\.]*\d){8}',
    -- formatted local numbers: 90-123-45-67 / 90 123 45 67
    '\d{2}[\s\-\.]\d{3}[\s\-\.]\d{2}[\s\-\.]\d{2}',
    -- bare digit runs (9..12 digits)
    '\m\d{9,12}\M',
    -- telegram
    '(?:https?://)?(?:www\.)?(?:t|telegram)\.me/[^\s]+',
    -- instagram / facebook
    '(?:https?://)?(?:www\.)?(?:instagram\.com|facebook\.com|fb\.com)/[^\s]+',
    -- @handles (telegram/instagram usernames, also catches email domains-ish)
    '@[A-Za-z0-9_\.]{4,32}'
  ];
begin
  masked := coalesce(p_text, '');
  hits := 0;

  foreach v_pattern in array v_simple_patterns loop
    select count(*) into v_count from regexp_matches(masked, v_pattern, 'gi') m;
    if v_count > 0 then
      hits := hits + v_count;
      masked := regexp_replace(masked, v_pattern, v_label, 'gi');
    end if;
  end loop;

  -- generic URLs, keeping platform domains
  for v_url in
    select distinct m[1] from regexp_matches(masked, '(https?://[^\s]+)', 'gi') m
  loop
    if v_url !~* '(^|[/.])ustoz\.uz' then
      hits := hits + 1;
      masked := replace(masked, v_url, v_label);
    end if;
  end loop;
end $$;

-- ============ Free slots ============

-- rules − exceptions − active bookings, 30-min grid, Asia/Tashkent
create or replace function public.get_free_slots(
  p_teacher_id   uuid,
  p_from         date,
  p_to           date,
  p_duration_min int
) returns table (slot_start timestamptz)
language plpgsql stable set search_path = public as $$
declare
  d       date;
  r       record;
  m       int;
  v_start timestamptz;
  v_end   timestamptz;
begin
  if p_duration_min not in (20,30,60,90) then
    raise exception 'INVALID_DURATION';
  end if;
  if p_to < p_from or (p_to - p_from) > 31 then
    raise exception 'INVALID_RANGE';
  end if;

  d := p_from;
  while d <= p_to loop
    for r in
      select ar.start_min, ar.end_min
      from availability_rules ar
      where ar.teacher_id = p_teacher_id
        and ar.weekday = extract(dow from d)::int
    loop
      m := r.start_min;
      while m + p_duration_min <= r.end_min loop
        v_start := (d::timestamp + make_interval(mins => m)) at time zone 'Asia/Tashkent';
        v_end   := v_start + make_interval(mins => p_duration_min);

        if v_start > now()
          and not exists (
            select 1 from availability_exceptions ex
            where ex.teacher_id = p_teacher_id
              and ex.date = d
              and (ex.start_min is null
                   or (m < ex.end_min and m + p_duration_min > ex.start_min))
          )
          and not exists (
            select 1 from bookings b
            where b.teacher_id = p_teacher_id
              and b.status in ('pending_payment','paid','in_progress')
              and b.period && tstzrange(v_start, v_end)
          )
        then
          slot_start := v_start;
          return next;
        end if;
        m := m + 30;
      end loop;
    end loop;
    d := d + 1;
  end loop;
end $$;

-- ============ Become a teacher ============

-- Creates teacher_profiles + wallets + flips profiles.is_teacher atomically.
create or replace function public.become_teacher()
returns teacher_profiles
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_name text;
  v_base text;
  v_slug text;
  i      int := 0;
  v_row  teacher_profiles;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_row from teacher_profiles where user_id = v_uid;
  if found then
    return v_row;  -- idempotent
  end if;

  select full_name into v_name from profiles where id = v_uid;
  v_base := trim(both '-' from lower(regexp_replace(coalesce(v_name,''), '[^a-zA-Z0-9]+', '-', 'g')));
  if v_base = '' then v_base := 'ustoz'; end if;

  v_slug := v_base;
  while exists (select 1 from teacher_profiles where slug = v_slug) loop
    i := i + 1;
    v_slug := v_base || '-' || i::text;
  end loop;

  insert into teacher_profiles (user_id, slug) values (v_uid, v_slug) returning * into v_row;
  insert into wallets (teacher_id) values (v_uid) on conflict do nothing;
  update profiles set is_teacher = true where id = v_uid;
  return v_row;
end $$;

-- ============ Teacher monthly lesson counter (FREE limit) ============

-- lessons that count against the FREE monthly limit (paid/held/completed this Tashkent month)
create or replace function public.teacher_lessons_this_month(p_teacher_id uuid)
returns int language sql stable set search_path = public as $$
  select count(*)::int
  from bookings b
  where b.teacher_id = p_teacher_id
    and b.status in ('paid','in_progress','completed','no_show_student')
    and (b.start_at at time zone 'Asia/Tashkent')::date
        >= date_trunc('month', (now() at time zone 'Asia/Tashkent'))::date
$$;

-- ============ Wallet operations (SECURITY DEFINER, the only write path) ============

-- Credit teacher wallet for a completed lesson. Idempotent via lessons.wallet_credited.
create or replace function public.wallet_credit_lesson(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  b          bookings%rowtype;
  v_credited boolean;
  v_pct      int;
  v_gross    bigint;
  v_net      bigint;
begin
  select * into b from bookings where id = p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if b.status <> 'completed' and b.status <> 'no_show_student' then
    raise exception 'BOOKING_NOT_COMPLETED';
  end if;

  select wallet_credited into v_credited from lessons where booking_id = p_booking_id for update;
  if not found then raise exception 'LESSON_NOT_FOUND'; end if;
  if v_credited then return; end if;  -- idempotent

  v_pct := setting_int('acquiring_pct', 2);

  if b.kind = 'trial_free' then
    v_gross := 0;
  elsif b.kind = 'package' then
    select round(price_paid::numeric / lessons_total)::bigint
      into v_gross from student_packages where id = b.student_package_id;
    v_gross := coalesce(v_gross, 0);
  else
    v_gross := b.price;
  end if;

  v_net := round(v_gross * (100 - v_pct) / 100.0)::bigint;

  if v_net > 0 then
    update wallets set balance = balance + v_net where teacher_id = b.teacher_id;
    if not found then raise exception 'WALLET_NOT_FOUND'; end if;
    insert into wallet_transactions (teacher_id, type, amount, booking_id, comment)
      values (b.teacher_id, 'lesson_income', v_net,
              p_booking_id, format('gross=%s, acquiring=%s%%', v_gross, v_pct));
  end if;

  update lessons set wallet_credited = true where booking_id = p_booking_id;
  update teacher_profiles set lessons_done = lessons_done + 1 where user_id = b.teacher_id;
end $$;

-- Teacher requests a payout: freezes the amount, creates a pending request.
create or replace function public.wallet_request_payout(p_amount bigint, p_card_number text)
returns payout_requests
language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_min     bigint;
  v_balance bigint;
  v_row     payout_requests;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  v_min := setting_bigint('payout_min_amount', 5000000);  -- 50 000 UZS in tiyin
  if p_amount < v_min then
    raise exception 'PAYOUT_BELOW_MIN: min % tiyin', v_min;
  end if;
  if p_card_number !~ '^\d{16}$' then
    raise exception 'INVALID_CARD_NUMBER';
  end if;

  select balance into v_balance from wallets where teacher_id = v_uid for update;
  if not found then raise exception 'WALLET_NOT_FOUND'; end if;
  if v_balance < p_amount then raise exception 'INSUFFICIENT_BALANCE'; end if;

  insert into payout_requests (teacher_id, amount, card_number)
    values (v_uid, p_amount, p_card_number) returning * into v_row;

  update wallets set balance = balance - p_amount, frozen = frozen + p_amount
    where teacher_id = v_uid;
  insert into wallet_transactions (teacher_id, type, amount, payout_id, comment)
    values (v_uid, 'payout_freeze', -p_amount, v_row.id, 'payout requested');

  return v_row;
end $$;

-- Admin resolves a payout request: paid (money sent manually) or rejected (+reason).
create or replace function public.wallet_resolve_payout(
  p_payout_id uuid, p_approve boolean, p_comment text default null
) returns payout_requests
language plpgsql security definer set search_path = public as $$
declare
  v_row payout_requests;
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;

  select * into v_row from payout_requests where id = p_payout_id for update;
  if not found then raise exception 'PAYOUT_NOT_FOUND'; end if;
  if v_row.status <> 'pending' then raise exception 'PAYOUT_ALREADY_RESOLVED'; end if;

  perform 1 from wallets where teacher_id = v_row.teacher_id for update;

  if p_approve then
    update wallets set frozen = frozen - v_row.amount where teacher_id = v_row.teacher_id;
    insert into wallet_transactions (teacher_id, type, amount, payout_id, comment)
      values (v_row.teacher_id, 'payout', 0, v_row.id,
              format('paid out %s tiyin to card', v_row.amount));
    update payout_requests
      set status = 'paid',
          admin_id = auth.uid(),
          admin_comment = p_comment,
          resolved_at = now(),
          card_number = '************' || right(card_number, 4)
      where id = p_payout_id
      returning * into v_row;
  else
    update wallets set frozen = frozen - v_row.amount, balance = balance + v_row.amount
      where teacher_id = v_row.teacher_id;
    insert into wallet_transactions (teacher_id, type, amount, payout_id, comment)
      values (v_row.teacher_id, 'payout_unfreeze', v_row.amount, v_row.id, coalesce(p_comment,'rejected'));
    update payout_requests
      set status = 'rejected',
          admin_id = auth.uid(),
          admin_comment = p_comment,
          resolved_at = now()
      where id = p_payout_id
      returning * into v_row;
  end if;

  insert into admin_audit_log (admin_id, action, entity, entity_id, payload)
    values (auth.uid(), case when p_approve then 'payout_paid' else 'payout_rejected' end,
            'payout_requests', p_payout_id::text,
            jsonb_build_object('amount', v_row.amount, 'comment', p_comment));
  return v_row;
end $$;

-- ============ Student balance operations ============

-- Spend internal balance on a booking (called by booking-create with service role).
create or replace function public.student_balance_spend(
  p_student_id uuid, p_amount bigint, p_booking_id uuid
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_balance bigint;
begin
  if p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  select student_balance into v_balance from profiles where id = p_student_id for update;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  if v_balance < p_amount then raise exception 'INSUFFICIENT_BALANCE'; end if;

  update profiles set student_balance = student_balance - p_amount where id = p_student_id;
  insert into student_balance_transactions (student_id, type, amount, booking_id)
    values (p_student_id, 'booking_spend', -p_amount, p_booking_id);
end $$;

-- Refund a percentage of a booking to the student's internal balance.
-- Package bookings get the lesson credit returned instead of money.
create or replace function public.student_balance_refund(p_booking_id uuid, p_pct int)
returns void language plpgsql security definer set search_path = public as $$
declare
  b        bookings%rowtype;
  v_amount bigint;
begin
  if p_pct not between 0 and 100 then raise exception 'INVALID_PCT'; end if;
  select * into b from bookings where id = p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;

  if b.kind = 'package' and b.student_package_id is not null then
    if p_pct > 0 then
      update student_packages set lessons_left = lessons_left + 1 where id = b.student_package_id;
      insert into student_balance_transactions (student_id, type, amount, booking_id, comment)
        values (b.student_id, 'refund_in', 0, p_booking_id, 'package credit returned');
    end if;
    return;
  end if;

  v_amount := round(b.price * p_pct / 100.0)::bigint;
  if v_amount <= 0 then return; end if;

  update profiles set student_balance = student_balance + v_amount where id = b.student_id;
  insert into student_balance_transactions (student_id, type, amount, booking_id, comment)
    values (b.student_id, 'refund_in', v_amount, p_booking_id, format('refund %s%%', p_pct));
end $$;

-- Admin manual balance adjustment (docs/06 §2), comment required.
create or replace function public.admin_adjust_student_balance(
  p_student_id uuid, p_amount bigint, p_comment text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;
  if coalesce(trim(p_comment),'') = '' then raise exception 'COMMENT_REQUIRED'; end if;

  update profiles set student_balance = student_balance + p_amount where id = p_student_id;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;

  insert into student_balance_transactions (student_id, type, amount, comment)
    values (p_student_id, 'admin_adjust', p_amount, p_comment);
  insert into admin_audit_log (admin_id, action, entity, entity_id, payload)
    values (auth.uid(), 'student_balance_adjust', 'profiles', p_student_id::text,
            jsonb_build_object('amount', p_amount, 'comment', p_comment));
end $$;

-- ============ Gamification ============

-- Idempotent XP grant by (user, kind, ref). Updates xp, level and streak.
create or replace function public.grant_xp(p_user_id uuid, p_kind text, p_ref_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_rules  jsonb;
  v_xp     int;
  v_today  date;
  v_total  int;
  v_level  int;
begin
  if p_ref_id is not null and exists (
    select 1 from xp_events where user_id = p_user_id and kind = p_kind and ref_id = p_ref_id
  ) then
    return;  -- already granted
  end if;

  select value into v_rules from app_settings where key = 'xp_rules';
  v_xp := coalesce((v_rules ->> p_kind)::int, 0);
  if v_xp <= 0 then return; end if;

  insert into xp_events (user_id, kind, xp, ref_id) values (p_user_id, p_kind, v_xp, p_ref_id);

  insert into gamification (user_id, xp) values (p_user_id, v_xp)
  on conflict (user_id) do update set xp = gamification.xp + excluded.xp;

  v_today := (now() at time zone 'Asia/Tashkent')::date;
  update gamification g set
    streak_days = case
      when g.last_activity_date = v_today then g.streak_days
      when g.last_activity_date = v_today - 1 then g.streak_days + 1
      else 1
    end,
    last_activity_date = v_today
  where g.user_id = p_user_id;

  select xp into v_total from gamification where user_id = p_user_id;
  select count(*) into v_level
    from jsonb_array_elements_text(coalesce(
      (select value from app_settings where key = 'level_thresholds'),
      '[0]'::jsonb)) t(v)
    where v_total >= v::int;
  update gamification set level = greatest(v_level, 1) where user_id = p_user_id;
end $$;

-- ============ Execute grants ============
-- Money-moving internals: service role only.
revoke execute on function public.wallet_credit_lesson(uuid) from public, anon, authenticated;
revoke execute on function public.student_balance_spend(uuid, bigint, uuid) from public, anon, authenticated;
revoke execute on function public.student_balance_refund(uuid, int) from public, anon, authenticated;
revoke execute on function public.grant_xp(uuid, text, uuid) from public, anon, authenticated;
-- User-facing RPCs: authenticated only.
revoke execute on function public.wallet_request_payout(bigint, text) from public, anon;
revoke execute on function public.wallet_resolve_payout(uuid, boolean, text) from public, anon;
revoke execute on function public.admin_adjust_student_balance(uuid, bigint, text) from public, anon;
revoke execute on function public.become_teacher() from public, anon;
-- get_free_slots stays public (anon web needs teacher calendars for SEO pages).
