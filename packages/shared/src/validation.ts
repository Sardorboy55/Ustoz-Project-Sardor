import { z } from 'zod';
import { LESSON_DURATIONS, PACKAGE_SIZES, TRIAL_FREE_DURATION } from './constants';

/** Uzbek phone in E.164: +998 followed by 9 digits. */
export const phoneSchema = z
  .string()
  .transform((v) => v.replace(/[\s\-()]/g, ''))
  .pipe(z.string().regex(/^\+998\d{9}$/, 'INVALID_PHONE'));

export const otpCodeSchema = z.string().regex(/^\d{6}$/, 'INVALID_OTP');

export const uuidSchema = z.string().uuid();

export const localeSchema = z.enum(['uz', 'ru']);

export const lessonDurationSchema = z
  .number()
  .int()
  .refine(
    (d): d is (typeof LESSON_DURATIONS)[number] | typeof TRIAL_FREE_DURATION =>
      (LESSON_DURATIONS as readonly number[]).includes(d) || d === TRIAL_FREE_DURATION,
    'INVALID_DURATION',
  );

export const packageSizeSchema = z
  .number()
  .int()
  .refine((s) => (PACKAGE_SIZES as readonly number[]).includes(s), 'INVALID_PACKAGE_SIZE');

/** Positive integer money amount in tiyin. */
export const tiyinSchema = z.number().int().positive();

/** 16-digit Humo/Uzcard number (payouts). */
export const cardNumberSchema = z
  .string()
  .transform((v) => v.replace(/\s/g, ''))
  .pipe(z.string().regex(/^\d{16}$/, 'INVALID_CARD_NUMBER'));

/** Booking creation input (Edge Function booking-create, Phase 3). */
export const bookingCreateSchema = z.object({
  teacherSubjectId: uuidSchema,
  startAt: z.string().datetime({ offset: true }),
  durationMin: lessonDurationSchema,
  kind: z.enum(['regular', 'trial_free', 'trial_discount', 'package']).default('regular'),
  paymentProvider: z.enum(['payme', 'click', 'uzum', 'internal_balance']).optional(),
  studentPackageId: uuidSchema.optional(),
});
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;

/** Structured error shape returned by every Edge Function. */
export const edgeErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
export type EdgeError = z.infer<typeof edgeErrorSchema>;
