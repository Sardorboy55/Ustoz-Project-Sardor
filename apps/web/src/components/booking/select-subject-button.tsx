"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
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

  // Solid green fill. A subtle ring marks the currently selected subject.
  return (
    <Button
      variant="primary"
      size="md"
      className={cn(active && "ring-2 ring-brand-300 ring-offset-2", className)}
      onClick={() => openBooking(subjectId)}
    >
      {children}
    </Button>
  );
}
