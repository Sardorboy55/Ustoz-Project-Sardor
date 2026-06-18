// Mirrors of Postgres enums (supabase/migrations/20260612000200_enums.sql).
// Keep in sync — these are the single source of truth on the TS side.

export const USER_ROLES = ['student', 'teacher', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SUBSCRIPTION_TIERS = ['free', 'pro'] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

export const BOOKING_STATUSES = [
  'pending_payment',
  'paid',
  'in_progress',
  'completed',
  'cancelled_by_student',
  'cancelled_by_teacher',
  'no_show_student',
  'no_show_teacher',
  'expired',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_KINDS = ['regular', 'trial_free', 'trial_discount', 'package'] as const;
export type BookingKind = (typeof BOOKING_KINDS)[number];

export const PAYMENT_PROVIDERS = ['payme', 'click', 'uzum', 'internal_balance'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const PAYMENT_STATUSES = ['created', 'pending', 'succeeded', 'failed', 'refunded'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const WALLET_TX_TYPES = [
  'lesson_income',
  'payout',
  'payout_freeze',
  'payout_unfreeze',
  'refund_in',
  'booking_spend',
  'admin_adjust',
] as const;
export type WalletTxType = (typeof WALLET_TX_TYPES)[number];

export const PAYOUT_STATUSES = ['pending', 'approved', 'paid', 'rejected'] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const HOMEWORK_STATUSES = ['assigned', 'submitted', 'graded'] as const;
export type HomeworkStatus = (typeof HOMEWORK_STATUSES)[number];

export const NOTIFICATION_CHANNELS = ['push', 'sms'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const TEACHER_APPLICATION_STATUSES = [
  'interviewing',
  'pending_review',
  'approved',
  'rejected',
] as const;
export type TeacherApplicationStatus = (typeof TEACHER_APPLICATION_STATUSES)[number];
