-- ============ Payments & money ============
-- Rule: balances change ONLY through SECURITY DEFINER functions that insert
-- transaction rows and update aggregates in the same transaction.

create table payments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id),
  booking_id   uuid references bookings(id),
  package_id   uuid references student_packages(id),
  subscription boolean not null default false,        -- PRO subscription payment
  provider     payment_provider not null,
  amount       bigint not null check (amount > 0),    -- tiyin
  status       payment_status not null default 'created',
  external_id  text,                                  -- provider transaction id
  raw_payload  jsonb,
  created_at   timestamptz not null default now(),
  unique (provider, external_id)                      -- webhook idempotency
);
create index on payments (user_id, created_at desc);
create index on payments (booking_id);

create table wallets (
  teacher_id uuid primary key references teacher_profiles(user_id),
  balance    bigint not null default 0 check (balance >= 0),  -- available, tiyin
  frozen     bigint not null default 0 check (frozen  >= 0)   -- held by pending payout requests
);

-- Teacher wallet ledger. amount sign = effect on available balance
-- (lesson_income +, payout_freeze −, payout_unfreeze +, payout 0→frozen−, admin_adjust ±)
create table wallet_transactions (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references wallets(teacher_id),
  type       wallet_tx_type not null,
  amount     bigint not null,
  booking_id uuid references bookings(id),
  payout_id  uuid,
  comment    text,
  created_at timestamptz not null default now()
);
create index on wallet_transactions (teacher_id, created_at desc);

-- Student internal balance ledger (refunds in, booking spends, admin adjustments).
-- Aggregate lives in profiles.student_balance; admin panel shows this history (docs/06 §2).
create table student_balance_transactions (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id),
  type       wallet_tx_type not null check (type in ('refund_in','booking_spend','admin_adjust')),
  amount     bigint not null,                          -- + credit, − debit
  booking_id uuid references bookings(id),
  comment    text,
  created_at timestamptz not null default now()
);
create index on student_balance_transactions (student_id, created_at desc);

create table payout_requests (
  id            uuid primary key default gen_random_uuid(),
  teacher_id    uuid not null references teacher_profiles(user_id),
  amount        bigint not null check (amount > 0),
  card_number   text not null,                         -- Humo/Uzcard; masked to last 4 after resolution
  status        payout_status not null default 'pending',
  admin_id      uuid references profiles(id),
  admin_comment text,
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);
create index on payout_requests (status, created_at);
create index on payout_requests (teacher_id, created_at desc);

alter table wallet_transactions
  add constraint wallet_tx_payout_fk
  foreign key (payout_id) references payout_requests(id);

-- ============ Subscriptions ============

create table subscription_payments (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid not null references teacher_profiles(user_id),
  payment_id   uuid not null references payments(id),
  period_start date not null,
  period_end   date not null,
  created_at   timestamptz not null default now()
);
create index on subscription_payments (teacher_id, period_end desc);
-- PRO active = teacher_profiles.tier='pro' and tier_expires_at > now()
