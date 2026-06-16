"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useBookingSelection } from "./booking-context";

/** Opens the booking modal (no subject pre-selected — the widget asks). */
export function BookNowButton({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { openBooking } = useBookingSelection();
  return (
    <Button size="lg" className={className} onClick={() => openBooking()}>
      {children}
    </Button>
  );
}
