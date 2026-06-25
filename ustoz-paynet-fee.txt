-- ============================================================================
-- Paynet удерживает комиссию за перевод (наблюдаемо — фикс. 3 сум: заплатил 242
-- → на карту пришло 239). SMS показывает ПРИШЕДШУЮ сумму, поэтому матчинг по
-- точной сумме промахивался. Теперь ingest_payment_sms матчит И pay_amount,
-- И (pay_amount - комиссия). Комиссия в тийинах — настройка paynet_fee_tiyin.
-- ============================================================================

-- комиссия перевода в тийинах (3 сум = 300). Меняется тут при необходимости.
insert into app_settings (key, value) values ('paynet_fee_tiyin', to_jsonb(300))
  on conflict (key) do update set value = excluded.value;

create or replace function public.ingest_payment_sms(p_token text, p_sms text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_tok text; v_sms text; v_nums text[]; v_match manual_payments; v_cnt int; v_fee bigint;
begin
  select value into v_tok from app_secrets where key = 'sms_ingest_token';
  if v_tok is null or p_token is null or p_token <> v_tok then raise exception 'FORBIDDEN'; end if;
  v_fee := coalesce((select (value #>> '{}')::bigint from app_settings where key='paynet_fee_tiyin'), 0);
  v_sms := replace(coalesce(p_sms,''), chr(160), ' ');
  -- цифры целиком + «целая часть» без копеек/десятых (241.0 → 241)
  v_nums := array(select regexp_replace(m[1],'\D','','g')
                  from regexp_matches(v_sms,'[0-9][0-9 .,]*[0-9]|[0-9]','g') as m)
         || array(select regexp_replace(regexp_replace(m[1],'[.,][0-9]{1,2}[[:space:]]*$',''),'\D','','g')
                  from regexp_matches(v_sms,'[0-9][0-9 .,]*[0-9]|[0-9]','g') as m);
  -- матчим точную сумму И сумму за вычетом комиссии (пришло меньше на fee)
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
