-- Phase 1: student interests + mock SMS outbox for local/dev OTP testing

-- interests chosen at registration (personalizes the student home feed, docs/04 §4.1)
alter table profiles
  add column interest_category_ids uuid[] not null default '{}';

grant update (interest_category_ids) on profiles to authenticated;

-- Dev-only SMS outbox: sms-hook writes here when SMS_MODE=mock so tests and
-- developers can read the OTP. Not exposed to clients (admin select only).
create table mock_sms (
  id         bigint generated always as identity primary key,
  phone      text not null,
  body       text not null,
  otp        text,
  created_at timestamptz not null default now()
);
create index on mock_sms (phone, created_at desc);

alter table mock_sms enable row level security;
create policy mock_sms_admin_select on mock_sms for select using (is_admin());
