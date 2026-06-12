import { notFound } from "next/navigation";

// Note: because the [locale] segment streams (loading.tsx flushes the shell
// first), the HTTP status is 200 and Next adds <meta name="robots"
// content="noindex"> instead — crawlers won't index these URLs.

/**
 * Catch-all for unknown URLs inside a locale — routes them to the
 * localized not-found page (with header/footer) instead of the bare
 * framework 404.
 */
export default function CatchAllPage() {
  notFound();
}
