"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type BookingSelectionValue = {
  /** teacher_subjects.id chosen anywhere on the page (pricing cards / widget). */
  subjectId: string | null;
  /** Whether the booking modal is open. */
  open: boolean;
  selectSubject: (id: string, opts?: { scroll?: boolean }) => void;
  /** Open the booking modal, optionally pre-selecting a subject. */
  openBooking: (id?: string) => void;
  closeBooking: () => void;
};

const BookingSelectionContext = createContext<BookingSelectionValue | null>(null);

/**
 * Shares the chosen subject between the "Services & prices" cards and the
 * booking modal, and controls whether the modal is open. Server-rendered
 * sections can be nested inside.
 */
export function BookingProvider({
  children,
  initialSubjectId = null,
}: {
  children: ReactNode;
  initialSubjectId?: string | null;
}) {
  const [subjectId, setSubjectId] = useState<string | null>(initialSubjectId);
  const [open, setOpen] = useState(false);

  const selectSubject = useCallback(
    (id: string, opts?: { scroll?: boolean }) => {
      setSubjectId(id);
      if (opts?.scroll) {
        document
          .getElementById("booking")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [],
  );

  const openBooking = useCallback((id?: string) => {
    if (id) setSubjectId(id);
    setOpen(true);
  }, []);

  const closeBooking = useCallback(() => setOpen(false), []);

  return (
    <BookingSelectionContext.Provider
      value={{ subjectId, open, selectSubject, openBooking, closeBooking }}
    >
      {children}
    </BookingSelectionContext.Provider>
  );
}

export function useBookingSelection(): BookingSelectionValue {
  const ctx = useContext(BookingSelectionContext);
  if (!ctx) {
    throw new Error("useBookingSelection must be used inside BookingProvider");
  }
  return ctx;
}
