-- ============================================================================
-- Оплата ПАКЕТА уроков через Paynet QR (ручное/SMS-подтверждение), как урок и Pro.
-- Раньше пакет покупался только списанием с баланса (student_buy_package) — у
-- учеников баланса нет (платят через Paynet), поэтому «недостаточно средств».
-- Теперь: ученик выбирает пакет → создаётся manual_payment(purpose='package') с
-- уникальной суммой → платит по QR → грузит чек → админ/SMS подтверждает →
-- начисляется student_packages (без баланса).
-- ============================================================================

-- Параметры пакета храним прямо в платеже (для начисления при подтверждении).
alter table manual_payments add column if not exists pkg_teacher_subject_id uuid references teacher_subjects(id) on delete set null;
alter table manual_payments add column if not exists pkg_lessons int;
alter table manual_payments add column if not exists pkg_duration_min int;

-- ----------------------------------------------------------------------------
-- Создать/переиспользовать ожидающий платёж за пакет (с уникальной суммой-кодом).
-- ----------------------------------------------------------------------------
create or replace function public.ensure_package_payment(
  p_teacher_subject_id uuid, p_lessons int, p_duration_min int
) returns manual_payments
language plpgsql security definer set search_path = public as $$
declare
  v_uid      uuid := auth.uid();
  v_ts       teacher_subjects;
  v_base     bigint;
  v_discount int;
  v_price    bigint;
  v_row      manual_payments;
  v_pa       bigint;
  v_vc       int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_lessons not in (5, 10, 20) then raise exception 'INVALID_LESSONS'; end if;
  if p_duration_min not in (30, 60, 90) then raise exception 'INVALID_DURATION'; end if;

  select * into v_ts from teacher_subjects where id = p_teacher_subject_id and is_active;
  if not found then raise exception 'SUBJECT_NOT_FOUND'; end if;

  v_base := case p_duration_min
              when 30 then v_ts.price_30 when 60 then v_ts.price_60 when 90 then v_ts.price_90
            end;
  if v_base is null or v_base <= 0 then raise exception 'DURATION_NOT_OFFERED'; end if;

  v_discount := case p_lessons
                  when 5 then v_ts.pkg5_discount_pct
                  when 10 then v_ts.pkg10_discount_pct
                  when 20 then v_ts.pkg20_discount_pct
                end;
  v_price := round(v_base::numeric * p_lessons * (100 - v_discount) / 100.0);
  if v_price <= 0 then raise exception 'INVALID_PRICE'; end if;

  -- переиспользуем ожидающий платёж за ТАКОЙ ЖЕ пакет
  select * into v_row from manual_payments
    where student_id = v_uid and purpose = 'package' and status = 'pending'
      and pkg_teacher_subject_id = p_teacher_subject_id
      and pkg_lessons = p_lessons and pkg_duration_min = p_duration_min
    order by created_at desc limit 1;
  if found then
    if v_row.pay_amount is null then
      select pay_amount, verify_code into v_pa, v_vc from public._unique_pay_amount(v_price);
      update manual_payments set pay_amount = v_pa, verify_code = v_vc, amount = v_price
        where id = v_row.id returning * into v_row;
    end if;
    return v_row;
  end if;

  select pay_amount, verify_code into v_pa, v_vc from public._unique_pay_amount(v_price);
  insert into manual_payments
    (student_id, purpose, amount, pay_amount, verify_code, booking_id,
     pkg_teacher_subject_id, pkg_lessons, pkg_duration_min)
    values (v_uid, 'package', v_price, v_pa, v_vc, null,
            p_teacher_subject_id, p_lessons, p_duration_min)
    returning * into v_row;
  return v_row;
end $$;
revoke execute on function public.ensure_package_payment(uuid, int, int) from public, anon;
grant execute on function public.ensure_package_payment(uuid, int, int) to authenticated;

-- ----------------------------------------------------------------------------
-- Прикрепить чек к ожидающему платежу за пакет.
-- ----------------------------------------------------------------------------
create or replace function public.submit_package_payment(p_receipt_path text)
returns manual_payments
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_row manual_payments;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_row from manual_payments
    where student_id = v_uid and purpose = 'package' and status = 'pending'
    order by created_at desc limit 1;
  if not found then raise exception 'NO_PENDING_PACKAGE'; end if;
  update manual_payments set receipt_path = p_receipt_path where id = v_row.id
    returning * into v_row;
  return v_row;
end $$;
revoke execute on function public.submit_package_payment(text) from public, anon;
grant execute on function public.submit_package_payment(text) to authenticated;

-- ----------------------------------------------------------------------------
-- Подтверждение оплаты: добавляем ветку 'package' (начисляем student_packages).
-- Сохраняем существующие ветки pro/lesson + уведомления.
-- ----------------------------------------------------------------------------
create or replace function public._apply_payment_approval(p_payment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_pay manual_payments;
  b     bookings%rowtype;
  v_pct int;
  v_net bigint;
begin
  select * into v_pay from manual_payments where id = p_payment_id for update;
  if not found or v_pay.status <> 'pending' then return; end if;

  if v_pay.purpose = 'pro' then
    update teacher_profiles set
      tier = 'pro',
      tier_expires_at = greatest(now(), coalesce(tier_expires_at, now())) + interval '30 days'
    where user_id = v_pay.student_id;

  elsif v_pay.purpose = 'package' then
    insert into student_packages
      (student_id, teacher_subject_id, lessons_total, lessons_left,
       duration_min, price_paid, expires_at)
      values (v_pay.student_id, v_pay.pkg_teacher_subject_id, v_pay.pkg_lessons,
              v_pay.pkg_lessons, v_pay.pkg_duration_min, v_pay.amount,
              now() + interval '6 months');

  else
    select * into b from bookings where id = v_pay.booking_id for update;
    if found and b.status = 'pending_payment' then
      update bookings set status = 'paid' where id = b.id;
      v_pct := setting_int('acquiring_pct', 2);
      v_net := round(b.price * (100 - v_pct) / 100.0)::bigint;
      if v_net > 0 then
        insert into wallets (teacher_id) values (b.teacher_id) on conflict do nothing;
        update wallets set balance = balance + v_net where teacher_id = b.teacher_id;
        insert into wallet_transactions (teacher_id, type, amount, booking_id, comment)
          values (b.teacher_id, 'lesson_income', v_net, b.id,
                  format('payment, gross=%s, acquiring=%s%%', b.price, v_pct));
      end if;
      insert into lessons (booking_id, channel_name, wallet_credited)
        values (b.id, b.id::text, true)
        on conflict (booking_id) do update set wallet_credited = true;
      perform public._notify_booking_paid(b.id, b.price);
    end if;
  end if;
end $$;

revoke execute on function public._apply_payment_approval(uuid) from public, anon;
