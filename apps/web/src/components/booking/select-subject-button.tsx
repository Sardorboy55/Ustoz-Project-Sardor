"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useBookingSelection } from "./booking-context";

/** "Choose" button on a pricing card: selects the subject in the booking widget and scrolls to it. */
export function SelectSubjectButton({
  subjectId,
  children,
  className,
}: {
  subjectId: string;
  children: ReactNode;
  className?: string;
}) {
  const { subjectId: selected, openBooking } = useBookingSelection();
  const active = selected === subjectId;

  return (
    <Button
      variant={active ? "primary" : "secondary"}
      size="sm"
      className={className}
      onClick={() => openBooking(subjectId)}
    >
      {children}
    </Button>
  );
}
