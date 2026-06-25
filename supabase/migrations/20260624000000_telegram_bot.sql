-- ============================================================================
-- Telegram-бот уведомлений (ОТДЕЛЬНЫЙ бот, токен TELEGRAM_NOTIFY_BOT_TOKEN).
-- Что покрывает эта миграция (бэкенд-фундамент):
--   • привязка Telegram ↔ аккаунт через deep-link  t.me/<bot>?start=<token>
--   • очередь Telegram-уведомлений (канал 'telegram' в notifications)
--   • событие «куплен урок»     → ученику + преподавателю (триггер на status='paid')
--   • событие «урок завершён»   → ученику просьба оценить (триггер на status='completed')
--   • напоминания «за 15 мин» и «в момент старта» (функция для cron)
--   • запись оценки 1–5 из бота (вставка в reviews → триггеры сами пересчитают рейтинг/XP)
-- Доставку и приём делает edge-функция telegram-notify-bot (webhook + отправитель).
-- check_function_bodies=off — чтобы создать функции до коммита нового enum-значения.
-- ============================================================================

set check_function_bodies = off;

-- Канал доставки уведомлений в Telegram.
alter type notification_channel add value if not exists 'telegram';

-- ---------------------------------------------------------------------------
-- Привязка платформенного пользователя к Telegram-чату.
-- chat_id == telegram user id для приватного чата. Заполняется при /start.
-- ---------------------------------------------------------------------------
create table if not exists telegram_accounts (
  user_id   uuid primary key references profiles(id) on delete cascade,
  chat_id   bigint not null unique,
  username  text,
  linked_at timestamptz not null default now()
);
alter table telegram_accounts enable row level security;
drop policy if exists telegram_accounts_self on telegram_accounts;
create policy telegram_accounts_self on telegram_accounts
  for select using (user_id = auth.uid());

-- Одноразовые токены привязки: приложение генерит → строит ссылку
-- t.me/<bot>?start=<token> → бот при /start меняет токен на chat_id.
create table if not exists telegram_link_tokens (
  token      text primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes'
);
alter table telegram_link_tokens enable row level security;
-- доступ к токенам — только через функции ниже (клиенту напрямую не нужен).

-- App вызывает: вернуть свежий токен привязки для текущего пользователя.
create or replace function public.create_telegram_link_token()
returns text language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_token text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  delete from telegram_link_tokens where user_id = v_uid or expires_at < now();
  v_token := replace(gen_random_uuid()::text, '-', '');   -- 32 hex, deeplink-safe
  insert into telegram_link_tokens (token, user_id) values (v_token, v_uid);
  return v_token;
end $$;
revoke execute on function public.create_telegram_link_token() from public, anon;
grant execute on function public.create_telegram_link_token() to authenticated;

-- Бот (service role) вызывает при /start: обменять токен на привязку chat_id.
create or replace function public.consume_telegram_link_token(
  p_token text, p_chat_id bigint, p_username text default null
)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  select user_id into v_uid from telegram_link_tokens
    where token = p_token and expires_at > now();
  if v_uid is null then return false; end if;

  insert into telegram_accounts (user_id, chat_id, username)
    values (v_uid, p_chat_id, p_username)
    on conflict (user_id) do update
      set chat_id = excluded.chat_id, username = excluded.username, linked_at = now();
  delete from telegram_link_tokens where user_id = v_uid;
  return true;
end $$;
revoke execute on function public.consume_telegram_link_token(text, bigint, text)
  from public, anon, authenticated;   -- только из edge-функции (service role)
grant execute on function public.consume_telegram_link_token(text, bigint, text) to service_role;

-- ---------------------------------------------------------------------------
-- Поставить в очередь Telegram-уведомление — ТОЛЬКО если юзер привязал Telegram
-- (иначе доставить некуда, не копим мусор). Текст рендерит отправитель по
-- template+payload (uz/ru), как для in_app.
-- ---------------------------------------------------------------------------
create or replace function public._notify_telegram(
  p_user_id uuid, p_template text, p_payload jsonb
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from telegram_accounts where user_id = p_user_id) then
    return;
  end if;
  insert into notifications (user_id, channel, template, payload, scheduled_at)
    values (p_user_id, 'telegram', p_template, coalesce(p_payload, '{}'::jsonb), now());
end $$;
revoke execute on function public._notify_telegram(uuid, text, jsonb)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Триггер «куплен урок»: на переход брони в status='paid' (любой путь оплаты:
-- QR, пакет, будущая карта) — Telegram ученику и преподавателю.
-- ---------------------------------------------------------------------------
create or replace function public._tg_on_booking_paid()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_student text; v_teacher text; v_sub_uz text; v_sub_ru text;
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    select coalesce(full_name, '') into v_student from profiles where id = new.student_id;
    select coalesce(full_name, '') into v_teacher from profiles where id = new.teacher_id;
    select s.name_uz, s.name_ru into v_sub_uz, v_sub_ru
      from teacher_subjects ts join subjects s on s.id = ts.subject_id
      where ts.id = new.teacher_subject_id;

    perform public._notify_telegram(new.student_id, 'purchase_student',
      jsonb_build_object('booking_id', new.id, 'teacher_name', v_teacher,
        'subject_uz', v_sub_uz, 'subject_ru', v_sub_ru, 'start_at', new.start_at));
    perform public._notify_telegram(new.teacher_id, 'purchase_teacher',
      jsonb_build_object('booking_id', new.id, 'student_name', v_student,
        'subject_uz', v_sub_uz, 'subject_ru', v_sub_ru,
        'price', new.price, 'start_at', new.start_at));
  end if;
  return new;
end $$;
drop trigger if exists tg_on_booking_paid on bookings;
create trigger tg_on_booking_paid
  after update of status on bookings
  for each row execute function public._tg_on_booking_paid();

-- ---------------------------------------------------------------------------
-- Триггер «урок завершён»: на переход в status='completed' — попросить ученика
-- оценить преподавателя (звёзды придут кнопками в боте).
-- ---------------------------------------------------------------------------
create or replace function public._tg_on_lesson_completed()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_teacher text;
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    -- не просим оценку, если отзыв уже есть
    if not exists (select 1 from reviews where booking_id = new.id) then
      select coalesce(full_name, '') into v_teacher from profiles where id = new.teacher_id;
      perform public._notify_telegram(new.student_id, 'rate_teacher',
        jsonb_build_object('booking_id', new.id, 'teacher_name', v_teacher));
    end if;
  end if;
  return new;
end $$;
drop trigger if exists tg_on_lesson_completed on bookings;
create trigger tg_on_lesson_completed
  after update of status on bookings
  for each row execute function public._tg_on_lesson_completed();

-- ---------------------------------------------------------------------------
-- Напоминания о начале урока: «за 15 мин» и «в момент старта». Помечаем брони,
-- чтобы не слать повторно. Вызывать раз в минуту (pg_cron / scheduled edge fn).
-- ---------------------------------------------------------------------------
alter table bookings add column if not exists tg_reminded_15_at    timestamptz;
alter table bookings add column if not exists tg_reminded_start_at timestamptz;

create or replace function public.enqueue_lesson_reminders()
returns void language plpgsql security definer set search_path = public as $$
declare b bookings%rowtype;
begin
  -- за ~15 минут до старта
  for b in
    select * from bookings
    where status = 'paid' and tg_reminded_15_at is null
      and start_at > now() and start_at <= now() + interval '15 minutes'
  loop
    perform public._notify_telegram(b.student_id, 'lesson_soon',
      jsonb_build_object('booking_id', b.id, 'start_at', b.start_at, 'role', 'student'));
    perform public._notify_telegram(b.teacher_id, 'lesson_soon',
      jsonb_build_object('booking_id', b.id, 'start_at', b.start_at, 'role', 'teacher'));
    update bookings set tg_reminded_15_at = now() where id = b.id;
  end loop;

  -- в момент старта (окно 10 мин, чтобы не пропустить тик cron)
  for b in
    select * from bookings
    where status = 'paid' and tg_reminded_start_at is null
      and start_at <= now() and start_at > now() - interval '10 minutes'
  loop
    perform public._notify_telegram(b.student_id, 'lesson_start',
      jsonb_build_object('booking_id', b.id, 'start_at', b.start_at, 'role', 'student'));
    perform public._notify_telegram(b.teacher_id, 'lesson_start',
      jsonb_build_object('booking_id', b.id, 'start_at', b.start_at, 'role', 'teacher'));
    update bookings set tg_reminded_start_at = now() where id = b.id;
  end loop;
end $$;
revoke execute on function public.enqueue_lesson_reminders() from public, anon, authenticated;
grant execute on function public.enqueue_lesson_reminders() to service_role;

-- ---------------------------------------------------------------------------
-- Запись оценки из бота: бот (service role) зовёт по chat_id + booking + звёзды.
-- Вставка в reviews → триггеры recompute_teacher_rating и reviews_grant_xp сами
-- пересчитают рейтинг преподавателя и начислят XP.
-- ---------------------------------------------------------------------------
create or replace function public.submit_telegram_rating(
  p_chat_id bigint, p_booking_id uuid, p_stars int
)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_uid uuid; b bookings%rowtype;
begin
  if p_stars < 1 or p_stars > 5 then return false; end if;
  select user_id into v_uid from telegram_accounts where chat_id = p_chat_id;
  if v_uid is null then return false; end if;
  select * into b from bookings where id = p_booking_id;
  if not found or b.student_id <> v_uid then return false; end if;
  if b.status <> 'completed' then return false; end if;
  if exists (select 1 from reviews where booking_id = p_booking_id) then return false; end if;

  insert into reviews (booking_id, student_id, teacher_id, stars)
    values (p_booking_id, b.student_id, b.teacher_id, p_stars);
  return true;
end $$;
revoke execute on function public.submit_telegram_rating(bigint, uuid, int)
  from public, anon, authenticated;   -- только из edge-функции (service role)
grant execute on function public.submit_telegram_rating(bigint, uuid, int) to service_role;
