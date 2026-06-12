-- ============ Auth: create profile on signup ============

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone, locale)
  values (new.id, coalesce(new.phone, new.email, new.id::text), 'uz')
  on conflict (id) do nothing;
  insert into public.gamification (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- keep profiles.phone in sync after phone change confirmation
create or replace function public.handle_user_phone_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.phone is distinct from old.phone and new.phone is not null then
    update public.profiles set phone = new.phone where id = new.id;
  end if;
  return new;
end $$;

create trigger on_auth_user_phone_changed
  after update of phone on auth.users
  for each row execute function public.handle_user_phone_change();

-- ============ Chat: mask contacts + moderation queue + last_message_at ============

create or replace function public.messages_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_masked text;
  v_hits   int;
begin
  if new.body is not null and setting_bool('chat_masking_enabled', true) then
    select t.masked, t.hits into v_masked, v_hits from mask_contacts(new.body) t;
    if v_hits > 0 then
      new.body := v_masked;
      new.body_was_masked := true;
      if v_hits >= 3 then
        insert into moderation_queue (entity_type, entity_id, reason)
        values ('message', new.id, format('%s contact patterns masked', v_hits));
      end if;
    end if;
  end if;
  return new;
end $$;

create trigger messages_mask
  before insert on messages
  for each row execute function public.messages_before_insert();

create or replace function public.messages_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update chats set last_message_at = new.created_at where id = new.chat_id;
  return new;
end $$;

create trigger messages_touch_chat
  after insert on messages
  for each row execute function public.messages_after_insert();

-- ============ Reviews: rating recompute + XP ============

create or replace function public.recompute_teacher_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_teacher uuid := coalesce(new.teacher_id, old.teacher_id);
begin
  update teacher_profiles tp set
    rating_avg = coalesce((
      select round(avg(stars)::numeric, 2) from reviews
      where teacher_id = v_teacher and not is_hidden), 0),
    rating_count = (
      select count(*) from reviews
      where teacher_id = v_teacher and not is_hidden)
  where tp.user_id = v_teacher;
  return coalesce(new, old);
end $$;

create trigger reviews_recompute_rating
  after insert or update or delete on reviews
  for each row execute function public.recompute_teacher_rating();

create or replace function public.reviews_grant_xp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform grant_xp(new.student_id, 'review_left', new.booking_id);
  return new;
end $$;

create trigger reviews_xp
  after insert on reviews
  for each row execute function public.reviews_grant_xp();

-- ============ Subject limit by tier (FREE=1, PRO=5) ============

create or replace function public.enforce_subject_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_tier  subscription_tier;
  v_max   int;
  v_count int;
begin
  -- only when adding/activating a subject
  if tg_op = 'UPDATE' and (old.is_active or not new.is_active) then
    return new;
  end if;
  if not new.is_active then
    return new;
  end if;

  select tier into v_tier from teacher_profiles where user_id = new.teacher_id;
  v_max := case when v_tier = 'pro'
                then setting_int('pro_max_subjects', 5)
                else setting_int('free_max_subjects', 1) end;

  select count(*) into v_count from teacher_subjects
  where teacher_id = new.teacher_id and is_active
    and (tg_op = 'INSERT' or id <> new.id);

  if v_count >= v_max then
    raise exception 'SUBJECT_LIMIT: tier % allows max % active subjects', v_tier, v_max;
  end if;
  return new;
end $$;

create trigger teacher_subjects_limit
  before insert or update on teacher_subjects
  for each row execute function public.enforce_subject_limit();

-- ============ Teacher profile text moderation (contact filter) ============

create or replace function public.teacher_profiles_moderate()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_hits  int := 0;
  v_h     int;
  v_field text;
begin
  foreach v_field in array array[new.headline_uz, new.headline_ru, new.bio_uz, new.bio_ru] loop
    select t.hits into v_h from mask_contacts(coalesce(v_field, '')) t;
    v_hits := v_hits + coalesce(v_h, 0);
  end loop;

  if v_hits > 0 then
    new.moderation_flag := true;
    insert into moderation_queue (entity_type, entity_id, reason)
    values ('teacher_profile', new.user_id, format('%s contact patterns in profile text', v_hits));
  end if;
  return new;
end $$;

create trigger teacher_profiles_contact_filter
  before update of headline_uz, headline_ru, bio_uz, bio_ru on teacher_profiles
  for each row execute function public.teacher_profiles_moderate();
