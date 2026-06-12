-- get_free_slots must see bookings regardless of the caller's RLS visibility
-- (anon callers can't select other people's bookings, so occupied slots leaked
-- as free). The function only returns availability, never booking details —
-- SECURITY DEFINER is safe here.
create or replace function public.get_free_slots(
  p_teacher_id   uuid,
  p_from         date,
  p_to           date,
  p_duration_min int
) returns table (slot_start timestamptz)
language plpgsql stable security definer set search_path = public as $$
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
