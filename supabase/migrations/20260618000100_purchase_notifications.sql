-- ============================================================================
-- Уведомления при покупке урока (in-app).
--   • ученику    → поздравление «удачи, приятных уроков»
--   • преподавателю → «у вас купили урок» + сумма
-- Тексты собираются на клиенте по template + payload (uz/ru). Таблица
-- notifications уже есть, с RLS (читать свои / помечать read_at) и realtime.
-- check_function_bodies=off — чтобы создать функции до коммита нового значения enum.
-- ============================================================================

set check_function_bodies = off;

-- Канал для уведомлений внутри приложения (в дополнение к push/sms).
alter type notification_channel add value if not exists 'in_app';

-- ----------------------------------------------------------------------------
-- Создаёт пару in-app уведомлений по оплаченной брони. p_amount — сумма в тийинах
-- (цена урока до списания пакета), показывается преподавателю.
-- ----------------------------------------------------------------------------
create or replace function public._notify_booking_paid(p_booking_id uuid, p_amount bigint)
returns void language plpgsql security definer set search_path = public as $$
declare
  b         bookings%rowtype;
  v_student text;
  v_teacher text;
  v_sub_uz  text;
  v_sub_ru  text;
begin
  select * into b from bookings where id = p_booking_id;
  if not found then return; end if;

  select coalesce(full_name, '') into v_student from profiles where id = b.student_id;
  select coalesce(full_name, '') into v_teacher from profiles where id = b.teacher_id;
  select s.name_uz, s.name_ru into v_sub_uz, v_sub_ru
    from teacher_subjects ts join subjects s on s.id = ts.subject_id
    where ts.id = b.teacher_subject_id;

  -- Ученику — поздравление.
  insert into notifications (user_id, channel, template, payload, scheduled_at, sent_at)
    values (b.student_id, 'in_app', 'purchase_student',
            jsonb_build_object('booking_id', b.id, 'teacher_name', v_teacher,
                               'subject_uz', v_sub_uz, 'subject_ru', v_sub_ru,
                               'start_at', b.start_at),
            now(), now());

  -- Преподавателю — куплен урок + сумма.
  insert into notifications (user_id, channel, template, payload, scheduled_at, sent_at)
    values (b.teacher_id, 'in_app', 'purchase_teacher',
            jsonb_build_object('booking_id', b.id, 'student_name', v_student,
                               'subject_uz', v_sub_uz, 'subject_ru', v_sub_ru,
                               'amount', p_amount, 'start_at', b.start_at),
            now(), now());
end $$;
revoke execute on function public._notify_booking_paid(uuid, bigint) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Хук в оплату урока пакетом: после пометки 'paid' шлём уведомления.
-- (Будущая оплата Payme/баланс должна так же вызвать _notify_booking_paid.)
-- ----------------------------------------------------------------------------
create or replace function public.booking_pay_with_package(p_booking_id uuid)
returns bookings
language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  b        bookings%rowtype;
  v_pkg    student_packages%rowtype;
  v_amount bigint;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into b from bookings where id = p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if b.student_id <> v_uid then raise exception 'FORBIDDEN'; end if;
  if b.status <> 'pending_payment' then raise exception 'BOOKING_NOT_PENDING'; end if;
  if b.kind <> 'regular' then raise exception 'NOT_PACKAGEABLE'; end if;

  v_amount := b.price;  -- цена урока до обнуления пакетом — её увидит преподаватель

  -- A matching, non-expired package with credits left; soonest-expiring first.
  select * into v_pkg from student_packages
    where student_id = v_uid
      and teacher_subject_id = b.teacher_subject_id
      and duration_min = b.duration_min
      and lessons_left > 0
      and expires_at > now()
    order by expires_at asc
    limit 1
    for update;
  if not found then raise exception 'NO_PACKAGE'; end if;

  update student_packages set lessons_left = lessons_left - 1 where id = v_pkg.id;

  update bookings
    set kind = 'package', student_package_id = v_pkg.id, price = 0, status = 'paid'
    where id = p_booking_id
    returning * into b;

  perform public._notify_booking_paid(p_booking_id, v_amount);

  return b;
end $$;

revoke execute on function public.booking_pay_with_package(uuid) from public, anon;
grant execute on function public.booking_pay_with_package(uuid) to authenticated;
