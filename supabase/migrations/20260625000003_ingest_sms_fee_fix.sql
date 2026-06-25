-- ============================================================================
-- ГАРАНТИЯ: ingest_payment_sms матчит платёж С УЧЁТОМ комиссии Paynet.
-- Причина: из-за двух конкурирующих файлов 20260625000002_* на проде могла
-- остаться версия ingest_payment_sms БЕЗ матчинга по комиссии. Тогда: ученик
-- платит 709 → Paynet снимает ~3 сум → приходит 706 → старая функция ищет
-- только 709 → no_match, платёж «не найден».
--
-- Эта миграция переустанавливает функцию (идемпотентно) с матчингом и по
-- pay_amount, и по (pay_amount − paynet_fee_tiyin), в целых сумах и в тийинах.
-- Токен читается из app_secrets. Безопасно накатывать поверх любой версии.
-- ============================================================================
create or replace function public.ingest_payment_sms(p_token text, p_sms text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_tok text; v_sms text; v_nums text[]; v_match manual_payments; v_cnt int; v_fee bigint;
begin
  select value into v_tok from app_secrets where key = 'sms_ingest_token';
  if v_tok is null or p_token is null or p_token <> v_tok then raise exception 'FORBIDDEN'; end if;
  v_fee := coalesce((select (value #>> '{}')::bigint from app_settings where key='paynet_fee_tiyin'), 0);
  v_sms := replace(coalesce(p_sms,''), chr(160), ' ');
  -- цифры целиком + «целая часть» без копеек/десятых (706.0 → 706; 50 037,00 → 50037)
  v_nums := array(select regexp_replace(m[1],'\D','','g')
                  from regexp_matches(v_sms,'[0-9][0-9 .,]*[0-9]|[0-9]','g') as m)
         || array(select regexp_replace(regexp_replace(m[1],'[.,][0-9]{1,2}[[:space:]]*$',''),'\D','','g')
                  from regexp_matches(v_sms,'[0-9][0-9 .,]*[0-9]|[0-9]','g') as m);
  -- матчим точную сумму И сумму за вычетом комиссии Paynet (в целых сумах и тийинах)
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
