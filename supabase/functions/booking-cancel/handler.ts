// booking-cancel (docs/01 cancellation policy):
// student ≥12h before start → 100% refund to internal balance
// student <12h             → no refund (money stays with the teacher at completion)
// teacher any time         → 100% refund + cancel strike (3 in 30 days → derank, Phase 7 cron)
import { z } from "npm:zod@3";
import { adminClient, requireUser } from "../_shared/supabase.ts";
import { corsPreflight, err, json } from "../_shared/respond.ts";

const inputSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

const CANCELLABLE = ["pending_payment", "paid"];

export async function handleBookingCancel(req: Request): Promise<Response> {
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
  const { data: booking } = await db
    .from("bookings")
    .select("*")
    .eq("id", input.bookingId)
    .maybeSingle();
  if (!booking) return err(404, "NOT_FOUND", "booking not found");

  const isStudent = booking.student_id === user.id;
  const isTeacher = booking.teacher_id === user.id;
  if (!isStudent && !isTeacher) return err(403, "FORBIDDEN", "not a participant");
  if (!CANCELLABLE.includes(booking.status)) {
    return err(409, "NOT_CANCELLABLE", `status is ${booking.status}`);
  }

  // cancel window from app_settings (default 12h)
  const { data: windowRow } = await db
    .from("app_settings")
    .select("value")
    .eq("key", "cancel_window_hours")
    .maybeSingle();
  const windowH = Number(windowRow?.value ?? 12);
  const hoursLeft = (new Date(booking.start_at).getTime() - Date.now()) / 3600_000;

  const wasPaid = booking.status === "paid";
  const newStatus = isStudent ? "cancelled_by_student" : "cancelled_by_teacher";
  let refundPct = 0;
  if (wasPaid && booking.price > 0) {
    if (isTeacher) refundPct = 100;
    else refundPct = hoursLeft >= windowH ? 100 : 0;
  }

  const { data: updated, error: updErr } = await db
    .from("bookings")
    .update({ status: newStatus, cancel_reason: input.reason ?? null })
    .eq("id", booking.id)
    .eq("status", booking.status) // optimistic: no double-cancel
    .select("id");
  if (updErr) {
    console.error("booking-cancel update failed", updErr);
    return err(500, "UPDATE_FAILED", updErr.message);
  }
  // PostgREST returns no error when zero rows match the optimistic filter.
  // A concurrent/retried cancel already transitioned the booking — bail before
  // refunding again (student_balance_refund is the source of truth on amount).
  if (!updated || updated.length === 0) {
    return err(409, "ALREADY_CANCELLED", "booking is no longer cancellable");
  }

  if (refundPct > 0) {
    const { error: refundErr } = await db.rpc("student_balance_refund", {
      p_booking_id: booking.id,
      p_pct: refundPct,
    });
    if (refundErr) {
      // The booking is already cancelled but the student was not credited.
      // Surface a hard error so the failure is visible and retryable, rather
      // than returning 200 with a refundPct that never happened.
      console.error("refund failed", refundErr);
      return err(500, "REFUND_FAILED", "cancellation saved but refund failed; contact support");
    }
  }

  if (isTeacher) {
    // strike counter (recalculated over 30 days by the Phase 7 cron)
    await db.rpc("teacher_add_cancel_strike", { p_teacher_id: booking.teacher_id });
  }

  // cancellation notice to the other side
  await db.from("notifications").insert({
    user_id: isStudent ? booking.teacher_id : booking.student_id,
    channel: "push",
    template: "booking_cancelled",
    payload: { booking_id: booking.id, by: isStudent ? "student" : "teacher" },
    scheduled_at: new Date().toISOString(),
  });

  return json(200, { status: newStatus, refundPct });
}
