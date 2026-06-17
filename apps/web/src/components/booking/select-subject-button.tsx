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

  // Always white background + green border/text (secondary). A subtle ring marks
  // the currently selected subject without filling it solid green.
  return (
    <Button
      variant="secondary"
      size="md"
      className={cn(active && "ring-2 ring-brand-200", className)}
      onClick={() => openBooking(subjectId)}
    >
      {children}
    </Button>
  );
}
