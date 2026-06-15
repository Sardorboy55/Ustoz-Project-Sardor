-- Package lesson credit: distribute price_paid exactly across the package's
-- lessons (money flow is sacred — sum of credits must equal what was paid).
--
-- Before: every package lesson credited round(price_paid / lessons_total), so
-- the per-lesson grosses did not sum back to price_paid (e.g. 100000 / 3 =>
-- 33333 x3 = 99999, 1 tiyin never credited to the teacher).
--
-- Now: the first N-1 credited lessons get floor(price_paid / lessons_total) and
-- whichever lesson is credited last gets the leftover, so the grosses always
-- sum to exactly price_paid. Only the package branch changed; everything else
-- (trial_free, single lessons, acquiring %, idempotency) is identical.
create or replace function public.wallet_credit_lesson(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  b          bookings%rowtype;
  v_credited boolean;
  v_pct      int;
  v_gross    bigint;
  v_net      bigint;
  v_pkg_total bigint;  -- student_packages.price_paid
  v_pkg_count int;     -- student_packages.lessons_total
  v_pkg_done  int;     -- package lessons already credited
  v_base      bigint;  -- floor(price_paid / lessons_total)
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
    select price_paid, lessons_total into v_pkg_total, v_pkg_count
      from student_packages where id = b.student_package_id;
    v_pkg_total := coalesce(v_pkg_total, 0);
    v_pkg_count := coalesce(v_pkg_count, 0);
    if v_pkg_total <= 0 or v_pkg_count <= 0 then
      v_gross := 0;
    else
      -- lessons of this package already credited (current one not yet inserted)
      select count(*) into v_pkg_done
        from wallet_transactions wt
        join bookings bk on bk.id = wt.booking_id
        where bk.student_package_id = b.student_package_id
          and wt.type = 'lesson_income';
      v_base := v_pkg_total / v_pkg_count;  -- integer division = floor
      if v_pkg_done >= v_pkg_count - 1 then
        v_gross := v_pkg_total - v_base * (v_pkg_count - 1);  -- last lesson: remainder
      else
        v_gross := v_base;
      end if;
    end if;
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

revoke execute on function public.wallet_credit_lesson(uuid) from public, anon, authenticated;
