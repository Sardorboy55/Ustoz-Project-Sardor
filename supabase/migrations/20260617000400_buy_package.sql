-- Lesson packages (docs/04 §4.4). A student buys N lessons (5/10/20) of a given
-- subject+duration at the teacher's package discount, paid from the internal
-- student balance (online providers credit the same balance later). Credits are
-- consumed one-by-one when booking; teacher crediting on completion is already
-- handled by wallet_credit_lesson (20260615000200).

-- New ledger type for a package purchase (a spend).
alter table student_balance_transactions
  drop constraint if exists student_balance_transactions_type_check;
alter table student_balance_transactions
  add constraint student_balance_transactions_type_check
  check (type in ('refund_in', 'booking_spend', 'admin_adjust', 'topup', 'package_buy'));

create or replace function public.student_buy_package(
  p_teacher_subject_id uuid,
  p_lessons int,
  p_duration_min int
) returns student_packages
language plpgsql security definer set search_path = public as $$
declare
  v_uid      uuid := auth.uid();
  v_ts       teacher_subjects;
  v_base     bigint;
  v_discount int;
  v_price    bigint;
  v_pkg      student_packages;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_lessons not in (5, 10, 20) then raise exception 'INVALID_LESSONS'; end if;
  if p_duration_min not in (30, 60, 90) then raise exception 'INVALID_DURATION'; end if;

  select * into v_ts from teacher_subjects
    where id = p_teacher_subject_id and is_active;
  if not found then raise exception 'SUBJECT_NOT_FOUND'; end if;

  v_base := case p_duration_min
              when 30 then v_ts.price_30
              when 60 then v_ts.price_60
              when 90 then v_ts.price_90
            end;
  if v_base is null or v_base <= 0 then raise exception 'DURATION_NOT_OFFERED'; end if;

  v_discount := case p_lessons
                  when 5  then v_ts.pkg5_discount_pct
                  when 10 then v_ts.pkg10_discount_pct
                  when 20 then v_ts.pkg20_discount_pct
                end;

  -- Discounted total for the whole package, rounded to tiyin.
  v_price := round(v_base::numeric * p_lessons * (100 - v_discount) / 100.0);
  if v_price <= 0 then raise exception 'INVALID_PRICE'; end if;

  -- Charge the student's balance atomically (never go negative).
  update profiles set student_balance = student_balance - v_price
    where id = v_uid and student_balance >= v_price;
  if not found then raise exception 'INSUFFICIENT_BALANCE'; end if;

  insert into student_balance_transactions (student_id, type, amount, comment)
    values (v_uid, 'package_buy', -v_price,
            format('Пакет: %s уроков по %s мин', p_lessons, p_duration_min));

  insert into student_packages
    (student_id, teacher_subject_id, lessons_total, lessons_left,
     duration_min, price_paid, expires_at)
    values (v_uid, p_teacher_subject_id, p_lessons, p_lessons,
            p_duration_min, v_price, now() + interval '6 months')
    returning * into v_pkg;

  return v_pkg;
end $$;

revoke execute on function public.student_buy_package(uuid, int, int) from public, anon;
grant execute on function public.student_buy_package(uuid, int, int) to authenticated;
