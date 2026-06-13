// Row types for the tables clients read directly (snake_case = DB column names).
// Money is integer tiyin; timestamps are ISO strings (timestamptz).

import type {
  BookingKind,
  BookingStatus,
  HomeworkStatus,
  NotificationChannel,
  PaymentProvider,
  PaymentStatus,
  PayoutStatus,
  SubscriptionTier,
  WalletTxType,
} from './enums';
import type { Locale } from './constants';

export interface Profile {
  id: string;
  phone: string;
  full_name: string;
  avatar_url: string | null;
  locale: Locale;
  is_teacher: boolean;
  is_admin: boolean;
  is_banned: boolean;
  student_balance: number;
  fcm_tokens: string[];
  created_at: string;
}

export interface TeacherProfile {
  user_id: string;
  slug: string;
  headline_uz: string;
  headline_ru: string;
  bio_uz: string;
  bio_ru: string;
  intro_video_url: string | null;
  experience_years: number;
  teaching_langs: string[];
  is_verified: boolean;
  tier: SubscriptionTier;
  tier_expires_at: string | null;
  rating_avg: number;
  rating_count: number;
  lessons_done: number;
  cancel_strikes: number;
  search_boost: number;
  moderation_flag: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name_uz: string;
  name_ru: string;
  icon: string | null;
  sort: number;
  is_active: boolean;
}

export interface Subject {
  id: string;
  category_id: string;
  name_uz: string;
  name_ru: string;
  slug: string;
  is_active: boolean;
}

export interface TeacherSubject {
  id: string;
  teacher_id: string;
  subject_id: string;
  price_30: number | null;
  price_60: number;
  price_90: number | null;
  trial_free_enabled: boolean;
  trial_discount_pct: number;
  pkg5_discount_pct: number;
  pkg10_discount_pct: number;
  pkg20_discount_pct: number;
  is_active: boolean;
}

export interface AvailabilityRule {
  id: string;
  teacher_id: string;
  weekday: number; // 0=Sunday
  start_min: number;
  end_min: number;
}

export interface AvailabilityException {
  id: string;
  teacher_id: string;
  date: string; // yyyy-mm-dd
  start_min: number | null;
  end_min: number | null;
}

export interface Booking {
  id: string;
  student_id: string;
  teacher_id: string;
  teacher_subject_id: string;
  kind: BookingKind;
  status: BookingStatus;
  start_at: string;
  duration_min: number;
  price: number;
  student_package_id: string | null;
  cancel_reason: string | null;
  created_at: string;
}

export interface StudentPackage {
  id: string;
  student_id: string;
  teacher_subject_id: string;
  lessons_total: number;
  lessons_left: number;
  duration_min: number;
  price_paid: number;
  expires_at: string;
  created_at: string;
}

export interface Lesson {
  booking_id: string;
  video_provider: string;
  channel_name: string;
  started_at: string | null;
  ended_at: string | null;
  student_joined: boolean;
  teacher_joined: boolean;
  wallet_credited: boolean;
}

export interface Payment {
  id: string;
  user_id: string;
  booking_id: string | null;
  package_id: string | null;
  subscription: boolean;
  provider: PaymentProvider;
  amount: number;
  status: PaymentStatus;
  external_id: string | null;
  created_at: string;
}

export interface Wallet {
  teacher_id: string;
  balance: number;
  frozen: number;
}

export interface WalletTransaction {
  id: string;
  teacher_id: string;
  type: WalletTxType;
  amount: number;
  booking_id: string | null;
  payout_id: string | null;
  comment: string | null;
  created_at: string;
}

export interface PayoutRequest {
  id: string;
  teacher_id: string;
  amount: number;
  card_number: string;
  status: PayoutStatus;
  admin_id: string | null;
  admin_comment: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface Chat {
  id: string;
  student_id: string;
  teacher_id: string;
  last_message_at: string | null;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  body: string | null;
  body_was_masked: boolean;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
}

export interface Homework {
  id: string;
  teacher_id: string;
  student_id: string;
  booking_id: string | null;
  title: string;
  description: string | null;
  attachments: Array<{ url: string; name: string; size: number }>;
  quiz: { questions: Array<{ q: string; options: string[]; correct: number }> } | null;
  due_at: string | null;
  status: HomeworkStatus;
  created_at: string;
}

export interface Review {
  booking_id: string;
  student_id: string;
  teacher_id: string;
  stars: number;
  body: string | null;
  is_hidden: boolean;
  created_at: string;
}

export interface StudentFavorite {
  student_id: string;
  teacher_id: string;
  created_at: string;
}

export interface Gamification {
  user_id: string;
  xp: number;
  level: number;
  streak_days: number;
  streak_freezes: number;
  last_activity_date: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  channel: NotificationChannel;
  template: string;
  payload: Record<string, unknown>;
  scheduled_at: string;
  sent_at: string | null;
  read_at: string | null;
}
