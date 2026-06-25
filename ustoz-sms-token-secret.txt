-- ============================================================================
-- Безопасность: секретный sms_ingest_token больше НЕ в публично-читаемой
-- app_settings. Раньше anon мог прочитать его публичным ключом и подделывать
-- авто-подтверждения оплат (ingest_payment_sms с фейковой SMS). Переносим токен
-- в app_secrets с жёстким RLS (anon/authenticated не читают совсем),
-- ingest_payment_sms читает оттуда как SECURITY DEFINER (обходит RLS).
-- Заодно — фикс парсинга суммы: «241.0 so'm» теперь матчится (целая часть).
-- ============================================================================

create table if not exists app_secrets (key text primary key, value text not null);
alter table app_secrets enable row level security;
revoke all on app_secrets from anon, authenticated;

-- свежий токен (на каждой среде свой; на проде он уже выставлен вручную)
insert into app_secrets (key, value)
  values ('sms_ingest_token', md5(random()::text || random()::text || clock_timestamp()::text))
  on conflict (key) do update set value = excluded.value;

-- функция читает токен из app_secrets (а не из публичной app_settings)
create or replace function public.ingest_payment_sms(p_token text, p_sms text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_tok text; v_sms text; v_nums text[]; v_match manual_payments; v_cnt int;
begin
  select value into v_tok from app_secrets where key = 'sms_ingest_token';
  if v_tok is null or p_token is null or p_token <> v_tok then raise exception 'FORBIDDEN'; end if;
  v_sms := replace(coalesce(p_sms,''), chr(160), ' ');
  -- цифры целиком + «целая часть» без копеек/десятых (241.0 → 241; 50 037,00 → 50037)
  v_nums := array(select regexp_replace(m[1],'\D','','g')
                  from regexp_matches(v_sms,'[0-9][0-9 .,]*[0-9]|[0-9]','g') as m)
         || array(select regexp_replace(regexp_replace(m[1],'[.,][0-9]{1,2}[[:space:]]*$',''),'\D','','g')
                  from regexp_matches(v_sms,'[0-9][0-9 .,]*[0-9]|[0-9]','g') as m);
  select count(*) into v_cnt from manual_payments mp
   where mp.status='pending' and mp.pay_amount is not null
     and ((mp.pay_amount/100)::text = any(v_nums) or mp.pay_amount::text = any(v_nums));
  if v_cnt=0 then insert into payment_sms_log(raw,note) values(p_sms,'нет совпадения');
    return jsonb_build_object('matched',false,'reason','no_match'); end if;
  if v_cnt>1 then insert into payment_sms_log(raw,note) values(p_sms,'неоднозначно');
    return jsonb_build_object('matched',false,'reason','ambiguous'); end if;
  select mp.* into v_match from manual_payments mp
   where mp.status='pending' and mp.pay_amount is not null
     and ((mp.pay_amount/100)::text = any(v_nums) or mp.pay_amount::text = any(v_nums)) limit 1;
  perform public._apply_payment_approval(v_match.id);
  update manual_payments set status='confirmed', review_note='auto: SMS Paynet', reviewed_at=now()
   where id=v_match.id;
  insert into payment_sms_log(raw,matched_payment,matched_amount,note)
   values(p_sms,v_match.id,v_match.pay_amount,'подтверждено автоматически');
  return jsonb_build_object('matched',true,'payment_id',v_match.id,'amount',v_match.pay_amount);
end $$;
revoke execute on function public.ingest_payment_sms(text, text) from public;
grant execute on function public.ingest_payment_sms(text, text) to anon, authenticated;

-- убрать засвеченный токен из публичной app_settings
delete from app_settings where key = 'sms_ingest_token';
