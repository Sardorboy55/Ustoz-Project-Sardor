import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

// next-intl middleware: needed for `localePrefix: 'as-needed'` to actually work.
// It (a) resolves the prefix-less default-locale (uz) requests to the right
// internal segment, (b) persists the user's explicit language choice in the
// NEXT_LOCALE cookie, and (c) redirects between uz (no prefix) and /ru, /en when
// the LocaleSwitcher navigates. Without it, locale switching silently no-ops and
// the prefix-less default routes are not negotiated.
//
// Browser Accept-Language detection is disabled in routing.ts (localeDetection:
// false), so a first visit without a saved choice always lands on uz.
export default createMiddleware(routing);

export const config = {
  // Run on app routes, but EXCLUDE infrastructure paths that are handled by
  // rewrites in next.config.ts and must NOT be touched by i18n routing:
  //   - /supa/*        → Supabase proxy (ibilim.uz/supa) used by mobile + web
  //   - /auth/callback → OAuth callback rewritten to /uz/auth/callback
  //   - /api/*         → API routes
  //   - /_next/*, /_vercel/* → framework internals
  //   - any path containing a dot (static files: .png, .svg, .ico, .html, sw.js…)
  //
  // NB: the proxy exclusion is "supa/" (with the slash), NOT a bare "supa", so it
  // matches ONLY the Supabase proxy prefix and does not accidentally swallow
  // future routes like /support or /supabase out of i18n routing. A bare /supa
  // (no segment) has no proxy handler anyway, so letting it fall through to i18n
  // is harmless.
  matcher: [
    '/((?!api|_next|_vercel|supa/|auth/callback|.*\\..*).*)',
  ],
};
