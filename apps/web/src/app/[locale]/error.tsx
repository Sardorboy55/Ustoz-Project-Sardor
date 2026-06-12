"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

/** Segment error boundary: human-friendly message + retry, no raw errors. */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep the technical details out of the UI, but log them for debugging.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-16 sm:px-6">
      <ErrorState onRetry={reset} className="w-full max-w-lg" />
    </main>
  );
}
