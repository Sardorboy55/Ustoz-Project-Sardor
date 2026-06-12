-- Phase 3: booking support functions

-- teacher cancellation strike (docs/01: 3 per 30 days → derank; cron recalcs in Phase 7)
create or replace function public.teacher_add_cancel_strike(p_teacher_id uuid)
returns void language sql security definer set search_path = public as $$
  update teacher_profiles
     set cancel_strikes = cancel_strikes + 1
   where user_id = p_teacher_id
$$;
revoke execute on function public.teacher_add_cancel_strike(uuid) from public, anon, authenticated;

-- pending_payment older than the TTL → expired, slot freed (docs/03)
create or replace function public.expire_stale_bookings()
returns int language plpgsql security definer set search_path = public as $$
declare
  v_ttl int := setting_int('pending_payment_ttl_min', 15);
  v_count int;
begin
  update bookings
     set status = 'expired'
   where status = 'pending_payment'
     and created_at < now() - make_interval(mins => v_ttl);
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke execute on function public.expire_stale_bookings() from public, anon, authenticated;

-- schedule via pg_cron when available (hosted Supabase has it; local image too)
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule(
      'expire-stale-bookings',
      '*/5 * * * *',
      $job$ select public.expire_stale_bookings(); $job$
    );
  end if;
exception when others then
  raise notice 'pg_cron scheduling skipped: %', sqlerrm;
end $$;
