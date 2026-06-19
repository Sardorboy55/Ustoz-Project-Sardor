-- ============================================================================
-- Ручное подтверждение оплаты по QR (Paynet) администратором.
-- Ученик бронирует урок → платит по QR на нужную сумму → грузит скрин чека →
-- админ сверяет и подтверждает → бронь 'paid' и деньги СРАЗУ на баланс
-- преподавателя (минус эквайринг %, как в wallet_credit_lesson).
--
-- Чтобы завершение урока (lesson_complete → wallet_credit_lesson) не начислило
-- второй раз — ставим lessons.wallet_credited=true при подтверждении.
-- ============================================================================

create type manual_payment_status as enum ('pending', 'confirmed', 'rejected');

create table manual_payments (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references bookings(id) on delete cascade,
  student_id  uuid not null references profiles(id) on delete cascade,
  amount      bigint not null,              -- тийины, снимок цены брони
  receipt_path text,                        -- скрин чека в Storage (payment-receipts)
  status      manual_payment_status not null default 'pending',
  reviewer_id uuid references profiles(id) on delete set null,
  review_note text,
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz
);

create index manual_payments_status_idx  on manual_payments (status, created_at desc);
create index manual_payments_student_idx on manual_payments (student_id, created_at desc);
create index manual_payments_booking_idx on manual_payments (booking_id);

alter table manual_payments enable row level security;

create policy manual_payments_select_own on manual_payments
  for select using ((select auth.uid()) = student_id);
create policy manual_payments_select_admin on manual_payments
  for select using (is_admin());
-- Записи — только через RPC ниже.

-- Storage: приватный бакет для чеков (файлы под {student_id}/...).
insert into storage.buckets (id, name, public)
  values ('payment-receipts', 'payment-receipts', false)
  on conflict (id) do nothing;

drop policy if exists "receipts insert own" on storage.objects;
create policy "receipts insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payment-receipts'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "receipts read own" on storage.objects;
create policy "receipts read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-receipts'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "receipts read admin" on storage.objects;
create policy "receipts read admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-receipts' and is_admin());

-- ============================================================================
-- submit_payment_proof — ученик отправляет чек по своей броне.
-- Идемпотентно: переиспользует pending-заявку этой брони.
-- ============================================================================
create or replace function public.submit_payment_proof(
  p_booking_id uuid,
  p_receipt_path text
)
returns manual_payments
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  b     bookings%rowtype;
  v_row manual_payments;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into b from bookings where id = p_booking_id;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if b.student_id <> v_uid then raise exception 'FORBIDDEN'; end if;
  if b.status <> 'pending_payment' then raise exception 'BOOKING_NOT_PENDING'; end if;

  select * into v_row from manual_payments
    where booking_id = p_booking_id and status = 'pending'
    order by created_at desc limit 1;

  if found then
    update manual_payments
      set receipt_path = coalesce(p_receipt_path, receipt_path), amount = b.price
      where id = v_row.id
      returning * into v_row;
    return v_row;
  end if;

  insert into manual_payments (booking_id, student_id, amount, receipt_path)
    values (p_booking_id, v_uid, b.price, p_receipt_path)
    returning * into v_row;
  return v_row;
end $$;

-- ============================================================================
-- admin_confirm_payment — решение админа. Approve: бронь 'paid' + немедленное
-- начисление преподавателю (нетто) + защита от двойного начисления.
-- ============================================================================
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

  select * into b from bookings where id = v_pay.booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;

  if p_approve then
    if b.status = 'pending_payment' then
      update bookings set status = 'paid' where id = b.id;

      -- немедленное начисление преподавателю (минус эквайринг %)
      v_pct := setting_int('acquiring_pct', 2);
      v_net := round(b.price * (100 - v_pct) / 100.0)::bigint;
      if v_net > 0 then
        insert into wallets (teacher_id) values (b.teacher_id) on conflict do nothing;
        update wallets set balance = balance + v_net where teacher_id = b.teacher_id;
        insert into wallet_transactions (teacher_id, type, amount, booking_id, comment)
          values (b.teacher_id, 'lesson_income', v_net, b.id,
                  format('manual QR payment, gross=%s, acquiring=%s%%', b.price, v_pct));
      end if;

      -- защита от повторного начисления на завершении урока
      insert into lessons (booking_id, channel_name, wallet_credited)
        values (b.id, b.id::text, true)
        on conflict (booking_id) do update set wallet_credited = true;
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
            jsonb_build_object('approve', p_approve, 'booking_id', v_pay.booking_id,
                               'amount', v_pay.amount, 'note', p_note));
end $$;

revoke execute on function public.submit_payment_proof(uuid, text) from public, anon;
revoke execute on function public.admin_confirm_payment(uuid, boolean, text) from public, anon;
grant execute on function public.submit_payment_proof(uuid, text) to authenticated;
grant execute on function public.admin_confirm_payment(uuid, boolean, text) to authenticated;
