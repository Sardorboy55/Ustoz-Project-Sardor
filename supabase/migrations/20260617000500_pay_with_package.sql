-- Pay a pending booking with a lesson package (docs/04 §4.4): consume one credit
-- from a matching package and mark the booking paid. The teacher is credited on
-- completion by wallet_credit_lesson, which splits price_paid across the pack.
create or replace function public.booking_pay_with_package(p_booking_id uuid)
returns bookings
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  b     bookings%rowtype;
  v_pkg student_packages%rowtype;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into b from bookings where id = p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if b.student_id <> v_uid then raise exception 'FORBIDDEN'; end if;
  if b.status <> 'pending_payment' then raise exception 'BOOKING_NOT_PENDING'; end if;
  if b.kind <> 'regular' then raise exception 'NOT_PACKAGEABLE'; end if;

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

  return b;
end $$;

revoke execute on function public.booking_pay_with_package(uuid) from public, anon;
grant execute on function public.booking_pay_with_package(uuid) to authenticated;
