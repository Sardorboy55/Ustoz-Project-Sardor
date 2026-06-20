-- ============================================================================
-- Фикс: неоплаченные брони «пропадали» через 15 минут после создания
-- (expire_stale_bookings отменял pending_payment старше pending_payment_ttl_min).
-- При ручной оплате (QR/SMS) 15 минут не хватает, и бронь исчезала ДО урока —
-- пользователь даже не знал. Теперь отменяем неоплаченную бронь только ПОСЛЕ
-- времени начала урока (+ запас pending_payment_grace_min, по умолчанию 30 мин).
-- Идемпотентно (create or replace); cron-задача уже вызывает эту функцию.
-- ============================================================================

create or replace function public.expire_stale_bookings()
returns int language plpgsql security definer set search_path = public as $$
declare
  v_grace int := setting_int('pending_payment_grace_min', 30);
  v_count int;
begin
  update bookings
     set status = 'expired'
   where status = 'pending_payment'
     and now() > start_at + make_interval(mins => v_grace);
  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke execute on function public.expire_stale_bookings() from public, anon, authenticated;
