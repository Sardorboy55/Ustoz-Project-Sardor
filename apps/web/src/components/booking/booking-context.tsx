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
  selectSubject: (id: string, opts?: { scroll?: boolean }) => void;
};

const BookingSelectionContext = createContext<BookingSelectionValue | null>(null);

/**
 * Shares the chosen subject between the "Services & prices" cards and the
 * booking widget. Server-rendered sections can be nested inside.
 */
export function BookingProvider({
  children,
  initialSubjectId = null,
}: {
  children: ReactNode;
  initialSubjectId?: string | null;
}) {
  const [subjectId, setSubjectId] = useState<string | null>(initialSubjectId);

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

  return (
    <BookingSelectionContext.Provider value={{ subjectId, selectSubject }}>
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
