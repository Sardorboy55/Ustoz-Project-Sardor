-- ============================================================================
-- Уведомления при РУЧНОЙ оплате (QR/SMS).
-- _apply_payment_approval (общая логика подтверждения для admin_confirm_payment
-- и ingest_payment_sms) раньше не слала in-app уведомления. Добавляем вызов
-- _notify_booking_paid → ученик получает поздравление, преподаватель — «купили
-- урок + сумма». Идемпотентно (create or replace).
-- ============================================================================

set check_function_bodies = off;

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
      -- in-app уведомления ученику и преподавателю (сумма — цена урока до комиссии)
      perform public._notify_booking_paid(b.id, b.price);
    end if;
  end if;
end $$;

revoke execute on function public._apply_payment_approval(uuid) from public, anon;
