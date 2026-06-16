"use client";

import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
import { BookingWidget, type BookingSubject } from "./booking-widget";
import { useBookingSelection } from "./booking-context";

/**
 * Booking flow in a modal (dimmed backdrop, step-by-step inside) instead of a
 * separate page or an inline section. Opened from the "Забронировать" button or
 * any "Выбрать" on a pricing card; controlled by the booking context.
 */
export function BookingModal({
  teacherId,
  teacherSlug,
  teacherName,
  subjects,
}: {
  teacherId: string;
  teacherSlug: string;
  teacherName: string;
  subjects: BookingSubject[];
}) {
  const t = useTranslations("Teacher");
  const { open, closeBooking } = useBookingSelection();

  return (
    <Modal
      open={open}
      onClose={closeBooking}
      title={t("scheduleTitle")}
      size="4xl"
      className="max-h-[90dvh] overflow-y-auto"
    >
      <BookingWidget
        teacherId={teacherId}
        teacherSlug={teacherSlug}
        teacherName={teacherName}
        subjects={subjects}
      />
    </Modal>
  );
}
