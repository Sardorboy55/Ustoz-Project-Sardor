-- ============================================================================
-- ФИКС авто-подтверждения по SMS: уникальная сумма-код теперь в ЦЕЛЫХ СУМАХ.
--
-- КОРНЕВАЯ ПРИЧИНА (выстрадано):
--   pay_amount = b.price + code*100. Код УЖЕ был в целых сумах, но БАЗА (b.price /
--   v_price пакета) приходила с дробными тийинами: пакет считается как
--   round(base * lessons * (100-discount)/100) → напр. 23552 тийин (235.52 сум),
--   а у урока цена может быть не кратна 100. Итог pay_amount = 23850 (238.50 сум).
--   Витрина показывает round(238.50)=239, ученик платит 239 целых сум, Paynet
--   снимает комиссию 3 → приходит 236. Матчер ждёт 238 (pay_amount/100) или
--   235 ((pay_amount-fee)/100) → 236 не совпадает НИ С ЧЕМ. А ещё дробные базы
--   у разных броней схлопываются в одну целую сумму → «неоднозначно».
--
-- РЕШЕНИЕ:
--   1) База округляется ВВЕРХ до целых сум: ceil(price/100)*100 (ученик никогда
--      не платит меньше реальной цены; копейки идут платформе как и код).
--   2) Код прибавляется шагом pay_code_step_uzs сум (дефолт 10), а НЕ 1 сум —
--      чтобы (сумма-комиссия) одной брони (шаг 10 - 3 = 7) не попадала в окно
--      соседней брони. Комиссия 3 сум < шаг 10 сум → пересечений нет.
--   3) pay_amount ВСЕГДА кратен 100 тийин (целые сумы). Витрина formatTiyin
--      делает (pay_amount/100).round() — для кратного 100 округление no-op,
--      показывает РОВНО pay_amount/100. Правок клиента не требуется.
--
-- Старые «копеечные» pending не трогаем — истекут / добьются вручную в админке.
-- ============================================================================

-- Шаг между уникальными суммами-кодами, в СУМАХ. Должен быть > комиссии Paynet
-- (paynet_fee_tiyin=300=3 сум), чтобы окна (сумма) и (сумма-комиссия) соседних
-- броней не пересекались. Дефолт 10 сум. Кол-во слотов на одну цену = 90 (10..900).
insert into app_settings (key, value) values ('pay_code_step_uzs', to_jsonb(10))
  on conflict (key) do nothing;

-- Макс. кода в сумах (верхняя граница диапазона). 900 сум при шаге 10 = 90 слотов.
insert into app_settings (key, value) values ('pay_code_max_uzs', to_jsonb(900))
  on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- Подобрать уникальную сумму-код. pay_amount ВСЕГДА кратен 100 тийин (целые сумы).
--   base_uzs = ceil(p_base/100)              -- цена, округлённая вверх до сум
--   v_pay    = (base_uzs + code_uzs) * 100   -- + код, всё в целых сумах
-- code_uzs пробегает step, 2*step, ... до max — уникально среди pending.
-- ----------------------------------------------------------------------------
create or replace function public._unique_pay_amount(p_base bigint)
returns table (pay_amount bigint, verify_code int)
language plpgsql security definer set search_path = public as $$
declare
  v_step int := coalesce((select (value #>> '{}')::int from app_settings where key='pay_code_step_uzs'), 10);
  v_max  int := coalesce((select (value #>> '{}')::int from app_settings where key='pay_code_max_uzs'), 900);
  v_base_uzs bigint := ceil(p_base::numeric / 100)::bigint;   -- цена в целых сумах (вверх)
  v_code int;
  v_pay  bigint;
  v_slots int;
  v_tries int := 0;
begin
  if v_step < 1 then v_step := 10; end if;
  v_slots := greatest(1, v_max / v_step);                    -- сколько уникальных кодов
  loop
    v_tries := v_tries + 1;
    -- код = (1..v_slots) * step сум, напр. 10,20,...,900
    v_code := (1 + floor(random() * v_slots)::int) * v_step;
    v_pay  := (v_base_uzs + v_code) * 100;                   -- целые сумы → тийины
    exit when not exists (
      select 1 from manual_payments
      where status = 'pending' and manual_payments.pay_amount = v_pay
    );
    -- все слоты заняты одновременными pending на эту цену — защита от вечного цикла
    if v_tries > v_slots * 4 then
      raise exception 'PAY_AMOUNT_SLOTS_EXHAUSTED base=% slots=%', p_base, v_slots;
    end if;
  end loop;
  pay_amount := v_pay; verify_code := v_code; return next;
end $$;

revoke execute on function public._unique_pay_amount(bigint) from public, anon;

-- ----------------------------------------------------------------------------
-- ingest_payment_sms: матч по ЦЕЛЫМ сумам. Т.к. pay_amount теперь кратен 100,
-- (pay_amount/100) и (pay_amount-fee)/100 — целые. Парсер и комиссия — как были.
-- (Совместимость: для старых дробных pay_amount /100 даёт целую часть — тоже ок.)
-- ----------------------------------------------------------------------------
create or replace function public.ingest_payment_sms(p_token text, p_sms text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_tok text; v_sms text; v_nums text[]; v_match manual_payments; v_cnt int; v_fee bigint;
begin
  select value into v_tok from app_secrets where key = 'sms_ingest_token';
  if v_tok is null or p_token is null or p_token <> v_tok then raise exception 'FORBIDDEN'; end if;
  v_fee := coalesce((select (value #>> '{}')::bigint from app_settings where key='paynet_fee_tiyin'), 0);
  v_sms := replace(coalesce(p_sms,''), chr(160), ' ');
  -- цифры целиком + «целая часть» без копеек/десятых (241.0 → 241; 50 037,00 → 50037)
  v_nums := array(select regexp_replace(m[1],'\D','','g')
                  from regexp_matches(v_sms,'[0-9][0-9 .,]*[0-9]|[0-9]','g') as m)
         || array(select regexp_replace(regexp_replace(m[1],'[.,][0-9]{1,2}[[:space:]]*$',''),'\D','','g')
                  from regexp_matches(v_sms,'[0-9][0-9 .,]*[0-9]|[0-9]','g') as m);
  -- матчим точную сумму (целые сумы) И сумму за вычетом комиссии Paynet
  select count(*) into v_cnt from manual_payments mp
   where mp.status='pending' and mp.pay_amount is not null
     and ( (mp.pay_amount/100)::text = any(v_nums) or mp.pay_amount::text = any(v_nums)
        or ((mp.pay_amount - v_fee)/100)::text = any(v_nums) or (mp.pay_amount - v_fee)::text = any(v_nums) );
  if v_cnt=0 then insert into payment_sms_log(raw,note) values(p_sms,'нет совпадения');
    return jsonb_build_object('matched',false,'reason','no_match'); end if;
  if v_cnt>1 then insert into payment_sms_log(raw,note) values(p_sms,'неоднозначно');
    return jsonb_build_object('matched',false,'reason','ambiguous'); end if;
  select mp.* into v_match from manual_payments mp
   where mp.status='pending' and mp.pay_amount is not null
     and ( (mp.pay_amount/100)::text = any(v_nums) or mp.pay_amount::text = any(v_nums)
        or ((mp.pay_amount - v_fee)/100)::text = any(v_nums) or (mp.pay_amount - v_fee)::text = any(v_nums) )
   limit 1;
  perform public._apply_payment_approval(v_match.id);
  update manual_payments set status='confirmed', review_note='auto: SMS Paynet', reviewed_at=now()
   where id=v_match.id;
  insert into payment_sms_log(raw,matched_payment,matched_amount,note)
   values(p_sms,v_match.id,v_match.pay_amount,'подтверждено автоматически');
  return jsonb_build_object('matched',true,'payment_id',v_match.id,'amount',v_match.pay_amount);
end $$;

revoke execute on function public.ingest_payment_sms(text, text) from public;
grant execute on function public.ingest_payment_sms(text, text) to anon, authenticated;
