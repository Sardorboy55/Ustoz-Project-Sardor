-- Status enums (mirrored in packages/shared — keep in sync)
create type user_role as enum ('student','teacher','admin');
create type subscription_tier as enum ('free','pro');
create type booking_status as enum (
  'pending_payment','paid','in_progress','completed',
  'cancelled_by_student','cancelled_by_teacher','no_show_student','no_show_teacher','expired'
);
create type booking_kind as enum ('regular','trial_free','trial_discount','package');
create type payment_provider as enum ('payme','click','uzum','internal_balance');
create type payment_status as enum ('created','pending','succeeded','failed','refunded');
create type wallet_tx_type as enum (
  'lesson_income','payout','payout_freeze','payout_unfreeze',
  'refund_in','booking_spend','admin_adjust'
);
create type payout_status as enum ('pending','approved','paid','rejected');
create type homework_status as enum ('assigned','submitted','graded');
create type notification_channel as enum ('push','sms');
