import { Suspense } from "react";
import { MessagesClient, MessagesSkeleton } from "./messages-client";

/**
 * /cabinet/messages — the client island uses useSearchParams (?chat=),
 * so it must be wrapped in Suspense for prerendering.
 */
export default function MessagesPage() {
  return (
    <Suspense fallback={<MessagesSkeleton />}>
      <MessagesClient />
    </Suspense>
  );
}
