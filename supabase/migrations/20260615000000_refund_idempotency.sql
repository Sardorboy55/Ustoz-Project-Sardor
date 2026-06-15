-- Make student-balance money functions idempotent (money flow is sacred).
-- Both student_balance_refund and student_balance_spend previously moved money
-- unconditionally, so a retried/duplicated call for the same booking would
-- refund or debit twice. We add an existence guard to each (skip if a ledger
-- row of that type already exists for the booking) plus partial-unique-index
-- backstops at the table level. Additive: replaces function bodies + indexes.
create or replace function public.student_balance_refund(p_booking_id uuid, p_pct int)
returns void language plpgsql security definer set search_path = public as $$
declare
  b        bookings%rowtype;
  v_amount bigint;
begin
  if p_pct not between 0 and 100 then raise exception 'INVALID_PCT'; end if;
  select * into b from bookings where id = p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;

  -- Idempotency guard: a refund for this booking was already issued.
  if exists (
    select 1 from student_balance_transactions
    where booking_id = p_booking_id and type = 'refund_in'
  ) then
    return;
  end if;

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

revoke execute on function public.student_balance_refund(uuid, int) from public, anon, authenticated;

-- Idempotent spend: a retried booking-create (service role) must not debit the
-- student twice for one booking. Mirrors the refund guard above.
create or replace function public.student_balance_spend(
  p_student_id uuid, p_amount bigint, p_booking_id uuid
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_balance bigint;
begin
  if p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;

  -- Idempotency guard: this booking was already charged.
  if exists (
    select 1 from student_balance_transactions
    where booking_id = p_booking_id and type = 'booking_spend'
  ) then
    return;
  end if;

  select student_balance into v_balance from profiles where id = p_student_id for update;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  if v_balance < p_amount then raise exception 'INSUFFICIENT_BALANCE'; end if;

  update profiles set student_balance = student_balance - p_amount where id = p_student_id;
  insert into student_balance_transactions (student_id, type, amount, booking_id)
    values (p_student_id, 'booking_spend', -p_amount, p_booking_id);
end $$;

revoke execute on function public.student_balance_spend(uuid, bigint, uuid) from public, anon, authenticated;

-- DB-level backstops: at most one spend and one refund ledger row per booking,
-- so even a concurrent double call (two txns racing past the in-function guard)
-- cannot double-move money — the second insert fails the unique constraint.
create unique index if not exists student_balance_tx_one_spend_per_booking
  on student_balance_transactions (booking_id) where type = 'booking_spend';
create unique index if not exists student_balance_tx_one_refund_per_booking
  on student_balance_transactions (booking_id) where type = 'refund_in';
