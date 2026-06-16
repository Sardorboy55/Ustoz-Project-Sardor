-- Balance top-up. Real top-ups must be credited from a verified payment-provider
-- webhook (Payme/Click/Uzum), which needs merchant accounts. Until that exists,
-- this provides a TEST-ONLY top-up so the balance flow can be exercised
-- end-to-end. It is gated on app_settings.payments_mode = 'test' and can NEVER
-- mint money in production (default = disabled when the setting is absent).

-- Allow the new 'topup' type in the student-balance ledger.
alter table student_balance_transactions
  drop constraint if exists student_balance_transactions_type_check;
alter table student_balance_transactions
  add constraint student_balance_transactions_type_check
  check (type in ('refund_in', 'booking_spend', 'admin_adjust', 'topup'));

-- Test-mode top-up: credits the caller's own balance (tiyin). Returns the new
-- balance. To enable in a dev project:
--   update app_settings set value = '"test"'::jsonb where key = 'payments_mode';
--   -- (or) insert into app_settings(key, value) values ('payments_mode', '"test"');
create or replace function public.student_balance_topup(p_amount bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_mode    text;
  v_balance bigint;
begin
  if p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  if p_amount > 100000000 then raise exception 'AMOUNT_TOO_LARGE'; end if; -- 1,000,000 UZS cap

  select value #>> '{}' into v_mode from app_settings where key = 'payments_mode';
  if coalesce(v_mode, 'live') <> 'test' then
    raise exception 'TOPUP_DISABLED'; -- live top-ups go through the provider webhook
  end if;

  update profiles set student_balance = student_balance + p_amount
    where id = auth.uid()
    returning student_balance into v_balance;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;

  insert into student_balance_transactions (student_id, type, amount, comment)
    values (auth.uid(), 'topup', p_amount, 'Пополнение баланса (тест)');

  return v_balance;
end $$;

revoke execute on function public.student_balance_topup(bigint) from public, anon;
grant execute on function public.student_balance_topup(bigint) to authenticated;
