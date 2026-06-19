-- ============================================================================
-- Авто-подтверждение оплаты по SMS от Paynet (0% комиссии).
-- Телефон с Paynet получает SMS «поступило N сум» → приложение-форвардер шлёт
-- текст на наш сервер → ingest_payment_sms находит ожидающую оплату по
-- УНИКАЛЬНОЙ сумме (pay_amount) и подтверждает её. Источник правды — реальная
-- SMS, а не скрин ученика. Защита — секретный токен (sms_ingest_token).
-- ============================================================================

-- Журнал входящих SMS (аудит).
create table if not exists payment_sms_log (
  id              uuid primary key default gen_random_uuid(),
  raw             text not null,
  matched_payment uuid references manual_payments(id) on delete set null,
  matched_amount  bigint,
  note            text,
  created_at      timestamptz not null default now()
);
alter table payment_sms_log enable row level security;
drop policy if exists payment_sms_log_admin on payment_sms_log;
create policy payment_sms_log_admin on payment_sms_log for select using (is_admin());

-- Секретный токен для форвардера (генерируем один раз).
insert into app_settings (key, value)
  values ('sms_ingest_token', to_jsonb(md5(random()::text || random()::text)))
  on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- Общая логика «одобрить оплату» (без проверки прав) — бронь оплачена +
-- начисление преподавателю / выдача Pro. Зовут и админ, и SMS.
-- ----------------------------------------------------------------------------
create or replace function public._apply_payment_approval(p_payment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_pay manual_payments;
  b     bookings%rowtype;
  v_pct int;
  v_net bigint;
begin
  select * into v_pay from manual_payments where id = p_payment_id for update;
  if not found or v_pay.status <> 'pending' then return; end if;

  if v_pay.purpose = 'pro' then
    update teacher_profiles set
      tier = 'pro',
      tier_expires_at = greatest(now(), coalesce(tier_expires_at, now())) + interval '30 days'
    where user_id = v_pay.student_id;
  else
    select * into b from bookings where id = v_pay.booking_id for update;
    if found and b.status = 'pending_payment' then
      update bookings set status = 'paid' where id = b.id;
      v_pct := setting_int('acquiring_pct', 2);
      v_net := round(b.price * (100 - v_pct) / 100.0)::bigint;
      if v_net > 0 then
        insert into wallets (teacher_id) values (b.teacher_id) on conflict do nothing;
        update wallets set balance = balance + v_net where teacher_id = b.teacher_id;
        insert into wallet_transactions (teacher_id, type, amount, booking_id, comment)
          values (b.teacher_id, 'lesson_income', v_net, b.id,
                  format('payment, gross=%s, acquiring=%s%%', b.price, v_pct));
      end if;
      insert into lessons (booking_id, channel_name, wallet_credited)
        values (b.id, b.id::text, true)
        on conflict (booking_id) do update set wallet_credited = true;
    end if;
  end if;
end $$;

-- admin_confirm_payment теперь использует общую логику.
create or replace function public.admin_confirm_payment(
  p_payment_id uuid, p_approve boolean, p_note text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare v_pay manual_payments;
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;
  select * into v_pay from manual_payments where id = p_payment_id for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if v_pay.status <> 'pending' then raise exception 'PAYMENT_ALREADY_RESOLVED'; end if;

  if p_approve then
    perform public._apply_payment_approval(p_payment_id);
    update manual_payments set status = 'confirmed', reviewer_id = auth.uid(),
           review_note = p_note, reviewed_at = now() where id = p_payment_id;
  else
    update manual_payments set status = 'rejected', reviewer_id = auth.uid(),
           review_note = p_note, reviewed_at = now() where id = p_payment_id;
  end if;

  insert into admin_audit_log (admin_id, action, entity, entity_id, payload)
    values (auth.uid(),
            case when p_approve then 'payment_confirm' else 'payment_reject' end,
            'manual_payments', p_payment_id::text,
            jsonb_build_object('approve', p_approve, 'purpose', v_pay.purpose,
                               'booking_id', v_pay.booking_id, 'amount', v_pay.amount, 'note', p_note));
end $$;

-- ----------------------------------------------------------------------------
-- Приём SMS: токен-защищён. Находит ожидающую оплату по уникальной сумме в
-- тексте SMS (сверяет и сумы, и тийины — на случай «.00»). Подтверждает её.
-- ----------------------------------------------------------------------------
create or replace function public.ingest_payment_sms(p_token text, p_sms text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_tok   text;
  v_sms   text;
  v_nums  text[];
  v_match manual_payments;
  v_cnt   int;
begin
  select value #>> '{}' into v_tok from app_settings where key = 'sms_ingest_token';
  if v_tok is null or p_token is null or p_token <> v_tok then
    raise exception 'FORBIDDEN';
  end if;

  v_sms := replace(coalesce(p_sms, ''), chr(160), ' ');   -- nbsp → пробел
  -- все числа из SMS → только цифры (50 037 → 50037; 50 037,00 → 5003700)
  v_nums := array(
    select regexp_replace(m[1], '\D', '', 'g')
    from regexp_matches(v_sms, '[0-9][0-9 .,]*[0-9]|[0-9]', 'g') as m
  );

  select count(*) into v_cnt
  from manual_payments mp
  where mp.status = 'pending' and mp.pay_amount is not null
    and ((mp.pay_amount / 100)::text = any(v_nums) or mp.pay_amount::text = any(v_nums));

  if v_cnt = 0 then
    insert into payment_sms_log (raw, note) values (p_sms, 'нет совпадения');
    return jsonb_build_object('matched', false, 'reason', 'no_match');
  end if;
  if v_cnt > 1 then
    insert into payment_sms_log (raw, note) values (p_sms, 'неоднозначно');
    return jsonb_build_object('matched', false, 'reason', 'ambiguous');
  end if;

  select mp.* into v_match
  from manual_payments mp
  where mp.status = 'pending' and mp.pay_amount is not null
    and ((mp.pay_amount / 100)::text = any(v_nums) or mp.pay_amount::text = any(v_nums))
  limit 1;

  perform public._apply_payment_approval(v_match.id);
  update manual_payments set status = 'confirmed', review_note = 'auto: SMS Paynet', reviewed_at = now()
    where id = v_match.id;
  insert into payment_sms_log (raw, matched_payment, matched_amount, note)
    values (p_sms, v_match.id, v_match.pay_amount, 'подтверждено автоматически');
  return jsonb_build_object('matched', true, 'payment_id', v_match.id, 'amount', v_match.pay_amount);
end $$;

revoke execute on function public._apply_payment_approval(uuid) from public, anon;
revoke execute on function public.ingest_payment_sms(text, text) from public;
grant execute on function public.ingest_payment_sms(text, text) to anon, authenticated;
