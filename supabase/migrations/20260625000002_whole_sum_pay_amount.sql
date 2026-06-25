-- ============================================================================
-- pay_amount ДОЛЖЕН быть в ЦЕЛЫХ сумах. Раньше код был целым, но база (b.price)
-- могла иметь копейки (урок 30 мин = цена/2 → 238.50). Paynet платят целыми →
-- копейки терялись, разные брони схлопывались в одну целую сумму → сопоставление
-- по SMS давало «неоднозначно»/no_match. Чиним:
--   • базу округляем до целого сума;
--   • код кратен 5 сум (> комиссии 3) — чтобы (сумма−комиссия) одной брони не
--     совпадала с суммой/«−комиссией» другой → нет ложной неоднозначности.
-- Итог: pay_amount всегда целый сум, уникальный, разнесён ≥5 сум.
-- ============================================================================

create or replace function public._unique_pay_amount(p_base bigint)
returns table (pay_amount bigint, verify_code int)
language plpgsql security definer set search_path = public as $$
declare v_code int; v_pay bigint; v_base bigint;
begin
  v_base := (round(p_base / 100.0))::bigint * 100;     -- база → ЦЕЛЫЙ сум
  loop
    v_code := 5 * (1 + floor(random() * 180)::int);    -- 5,10,…,900 (шаг 5 > комиссии)
    v_pay  := v_base + v_code * 100;                   -- всё в целых сумах (×100 тийин)
    exit when not exists (
      select 1 from manual_payments where status = 'pending' and manual_payments.pay_amount = v_pay
    );
  end loop;
  pay_amount := v_pay; verify_code := v_code; return next;
end $$;
revoke execute on function public._unique_pay_amount(bigint) from public, anon;
