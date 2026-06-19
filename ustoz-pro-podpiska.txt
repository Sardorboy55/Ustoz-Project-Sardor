-- ============================================================================
-- Pro-подписка по QR (ручное подтверждение админом). Расширяет manual_payments:
-- purpose='lesson' (за урок) | 'pro' (подписка). При подтверждении 'pro' —
-- teacher_profiles.tier='pro' на 30 дней (продлевается, если уже активна).
-- ============================================================================

alter table manual_payments add column if not exists purpose text not null default 'lesson';
alter table manual_payments alter column booking_id drop not null;

-- ----------------------------------------------------------------------------
-- Преподаватель отправляет чек за Pro.
-- ----------------------------------------------------------------------------
create or replace function public.submit_pro_payment(p_receipt_path text)
returns manual_payments
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_price bigint;
  v_row   manual_payments;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not exists (select 1 from teacher_profiles where user_id = v_uid) then
    raise exception 'NOT_A_TEACHER';
  end if;
  v_price := setting_int('pro_price', 14900000)::bigint;

  select * into v_row from manual_payments
    where student_id = v_uid and purpose = 'pro' and status = 'pending'
    order by created_at desc limit 1;
  if found then
    update manual_payments
      set receipt_path = coalesce(p_receipt_path, receipt_path), amount = v_price
      where id = v_row.id returning * into v_row;
    return v_row;
  end if;

  insert into manual_payments (student_id, purpose, amount, receipt_path, booking_id)
    values (v_uid, 'pro', v_price, p_receipt_path, null)
    returning * into v_row;
  return v_row;
end $$;

-- ----------------------------------------------------------------------------
-- Решение админа — теперь с ветвлением по purpose (урок / Pro).
-- ----------------------------------------------------------------------------
create or replace function public.admin_confirm_payment(
  p_payment_id uuid,
  p_approve boolean,
  p_note text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_pay manual_payments;
  b     bookings%rowtype;
  v_pct int;
  v_net bigint;
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;

  select * into v_pay from manual_payments where id = p_payment_id for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if v_pay.status <> 'pending' then raise exception 'PAYMENT_ALREADY_RESOLVED'; end if;

  if p_approve then
    if v_pay.purpose = 'pro' then
      -- Pro на 30 дней (продлеваем от текущего срока, если активен).
      update teacher_profiles set
        tier = 'pro',
        tier_expires_at = greatest(now(), coalesce(tier_expires_at, now())) + interval '30 days'
      where user_id = v_pay.student_id;
    else
      -- За урок: бронь оплачена + немедленное начисление преподавателю.
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
                    format('manual QR payment, gross=%s, acquiring=%s%%', b.price, v_pct));
        end if;

        insert into lessons (booking_id, channel_name, wallet_credited)
          values (b.id, b.id::text, true)
          on conflict (booking_id) do update set wallet_credited = true;
      end if;
    end if;

    update manual_payments
      set status = 'confirmed', reviewer_id = auth.uid(), review_note = p_note, reviewed_at = now()
      where id = p_payment_id;
  else
    update manual_payments
      set status = 'rejected', reviewer_id = auth.uid(), review_note = p_note, reviewed_at = now()
      where id = p_payment_id;
  end if;

  insert into admin_audit_log (admin_id, action, entity, entity_id, payload)
    values (auth.uid(),
            case when p_approve then 'payment_confirm' else 'payment_reject' end,
            'manual_payments', p_payment_id::text,
            jsonb_build_object('approve', p_approve, 'purpose', v_pay.purpose,
                               'booking_id', v_pay.booking_id, 'amount', v_pay.amount, 'note', p_note));
end $$;

revoke execute on function public.submit_pro_payment(text) from public, anon;
grant execute on function public.submit_pro_payment(text) to authenticated;
