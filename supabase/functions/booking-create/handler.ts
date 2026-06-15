// booking-create (docs/04 §4.3, Phase 3 — no payments yet):
// validates the slot, computes the price SERVER-SIDE from teacher_subjects,
// enforces the FREE monthly limit, inserts the booking and schedules reminders.
// kind=trial_free -> price 0, instantly 'paid' (one per student-teacher pair).
// kind=regular    -> 'pending_payment' (Phase 4 attaches the checkout).
import { z } from "npm:zod@3";
import { adminClient, requireUser } from "../_shared/supabase.ts";
import { corsPreflight, err, json } from "../_shared/respond.ts";

const inputSchema = z.object({
  teacherSubjectId: z.string().uuid(),
  startAt: z.string().datetime({ offset: true }),
  durationMin: z.number().int(),
  kind: z.enum(["regular", "trial_free"]).default("regular"),
});

const TRIAL_DURATION = 20;

export async function handleBookingCreate(req: Request): Promise<Response> {
  const pre = corsPreflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return err(405, "METHOD_NOT_ALLOWED", "POST only");

  const user = await requireUser(req);
  if (!user) return err(401, "UNAUTHENTICATED", "sign in required");

  let input: z.infer<typeof inputSchema>;
  try {
    input = inputSchema.parse(await req.json());
  } catch (e) {
    return err(400, "INVALID_INPUT", e instanceof z.ZodError ? e.issues[0].message : String(e));
  }

  const db = adminClient();

  // teacher subject + prices
  const { data: ts } = await db
    .from("teacher_subjects")
    .select("id, teacher_id, is_active, price_30, price_60, price_90, trial_free_enabled")
    .eq("id", input.teacherSubjectId)
    .maybeSingle();
  if (!ts || !ts.is_active) return err(404, "SUBJECT_NOT_FOUND", "teacher subject not found");
  if (ts.teacher_id === user.id) return err(400, "OWN_PROFILE", "cannot book yourself");

  // teacher not banned / not flagged
  const { data: teacher } = await db
    .from("teacher_profiles")
    .select("user_id, tier, moderation_flag, profiles!teacher_profiles_user_id_fkey!inner(is_banned)")
    .eq("user_id", ts.teacher_id)
    .maybeSingle();
  const teacherBanned =
    (teacher?.profiles as unknown as { is_banned: boolean } | null)?.is_banned;
  if (!teacher || teacher.moderation_flag || teacherBanned) {
    return err(404, "TEACHER_UNAVAILABLE", "teacher is not available");
  }

  const startAt = new Date(input.startAt);
  if (Number.isNaN(startAt.getTime()) || startAt.getTime() <= Date.now()) {
    return err(400, "INVALID_START", "start time must be in the future");
  }

  // price & status by kind (never trust the client with money)
  let price = 0;
  let status = "pending_payment";
  if (input.kind === "trial_free") {
    if (!ts.trial_free_enabled) return err(400, "TRIAL_DISABLED", "no free trial for this subject");
    if (input.durationMin !== TRIAL_DURATION) {
      return err(400, "INVALID_DURATION", "free trial is 20 minutes");
    }
    // one free trial per student-teacher pair (docs/01)
    const { count } = await db
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("student_id", user.id)
      .eq("teacher_id", ts.teacher_id)
      .eq("kind", "trial_free")
      .not("status", "in", '("cancelled_by_student","cancelled_by_teacher","expired")');
    if ((count ?? 0) > 0) return err(409, "TRIAL_USED", "free trial already used");
    status = "paid"; // free → no payment step
  } else {
    const priceByDuration: Record<number, number | null> = {
      30: ts.price_30,
      60: ts.price_60,
      90: ts.price_90,
    };
    const p = priceByDuration[input.durationMin];
    if (p == null) return err(400, "INVALID_DURATION", "duration not offered");
    price = p;
  }

  // FREE tier monthly limit (docs/04 §4.3): the slot just looks unavailable to students
  if (teacher.tier === "free") {
    const [{ data: limitRow }, { data: cnt }] = await Promise.all([
      db.from("app_settings").select("value").eq("key", "free_monthly_lessons_limit").maybeSingle(),
      db.rpc("teacher_lessons_this_month", { p_teacher_id: ts.teacher_id }),
    ]);
    const limit = Number(limitRow?.value ?? 10);
    const used = Number(Array.isArray(cnt) ? cnt[0] : cnt) || 0;
    if (used >= limit) {
      return err(409, "TEACHER_LIMIT", "teacher reached the monthly lesson limit");
    }
  }

  // insert — bookings_no_overlap exclusion constraint is the real double-booking guard
  const { data: booking, error: insErr } = await db
    .from("bookings")
    .insert({
      student_id: user.id,
      teacher_id: ts.teacher_id,
      teacher_subject_id: ts.id,
      kind: input.kind,
      status,
      start_at: startAt.toISOString(),
      duration_min: input.durationMin,
      price,
    })
    .select()
    .single();

  if (insErr) {
    if (insErr.code === "23P01") {
      return err(409, "SLOT_TAKEN", "slot is no longer available");
    }
    console.error("booking-create insert failed", insErr);
    return err(500, "INSERT_FAILED", insErr.message);
  }

  // lesson room row + reminders for already-paid bookings (trial_free)
  if (status === "paid") {
    await db.from("lessons").insert({ booking_id: booking.id, channel_name: booking.id });
    await scheduleReminders(db, booking);
  }

  return json(201, { booking });
}

// push −24h, push −1h, sms −1h (docs/04 §4.3)
async function scheduleReminders(
  db: ReturnType<typeof adminClient>,
  booking: { id: string; student_id: string; teacher_id: string; start_at: string },
) {
  const start = new Date(booking.start_at).getTime();
  const now = Date.now();
  const rows: Array<Record<string, unknown>> = [];
  const add = (userId: string, channel: string, template: string, at: number) => {
    if (at > now) {
      rows.push({
        user_id: userId,
        channel,
        template,
        payload: { booking_id: booking.id },
        scheduled_at: new Date(at).toISOString(),
      });
    }
  };
  for (const uid of [booking.student_id, booking.teacher_id]) {
    add(uid, "push", "booking_reminder_24h", start - 24 * 3600_000);
    add(uid, "push", "booking_reminder_1h", start - 3600_000);
    add(uid, "sms", "booking_reminder_1h", start - 3600_000);
  }
  if (rows.length) await db.from("notifications").insert(rows);
}
