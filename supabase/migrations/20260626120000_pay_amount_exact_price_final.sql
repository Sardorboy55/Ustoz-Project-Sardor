-- ============================================================================
-- ФИНАЛ (Temur): оплата опознаётся по ЧЕКУ (админ сверяет приложенный чек), а НЕ
-- по уникальной сумме. Поэтому кода-наценки больше НЕТ: pay_amount = РОВНО цена
-- урока/пакета/Pro, округлённая до целого сума. verify_code = 0.
--
-- ПОЧЕМУ НУЖЕН ЭТОТ ФАЙЛ:
--   На проде живут конкурирующие версии _unique_pay_amount с одинаковым/близким
--   timestamp (20260625000002_pay_amount_whole_uzs.sql и
--   20260625000002_whole_sum_pay_amount.sql), которые СНОВА добавляют код
--   (v_base + v_code*100). Если любая из них применилась ПОСЛЕ
--   20260626000000_pay_amount_exact_price.sql — функция опять отдаёт «цена+код»,
--   и на чекауте видно завышенную сумму (напр. 760 вместо 100).
--
--   Этот файл с timestamp 20260626120000 > всех 20260625* и > 20260626000000 →
--   применяется ПОСЛЕДНИМ и гарантированно переустанавливает финальную версию
--   поверх любой предыдущей. Идемпотентно (create or replace), аддитивно.
--
-- Других мест, формирующих pay_amount, НЕТ: ensure_lesson_payment /
-- ensure_pro_payment / ensure_package_payment все берут сумму ТОЛЬКО из
-- public._unique_pay_amount(base). Достаточно переопределить эту одну функцию.
-- ============================================================================

create or replace function public._unique_pay_amount(p_base bigint)
returns table (pay_amount bigint, verify_code int)
language plpgsql security definer set search_path = public as $$
begin
  -- РОВНО цена, округлённая до целого сума (×100 тийин). БЕЗ кода-наценки.
  pay_amount  := (round(p_base / 100.0))::bigint * 100;
  verify_code := 0;
  return next;
end $$;

revoke execute on function public._unique_pay_amount(bigint) from public, anon;
