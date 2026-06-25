import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Next 16: the network-boundary file is `proxy.ts` (ex-middleware), nodejs runtime.
const intl = createIntlMiddleware(routing);

export default function proxy(request: Request) {
  return intl(request as never);
}

export const config = {
  // Run on app routes, but EXCLUDE infrastructure paths handled by rewrites in
  // next.config.ts that must NOT be touched by i18n routing:
  //   - /supa/*        → Supabase proxy (ibilim.uz/supa) used by mobile + web
  //   - /auth/callback → OAuth callback rewritten to /uz/auth/callback
  //   - /api/*, /_next/*, /_vercel/*, any path with a dot (static files)
  // The "supa/" exclusion uses the slash so it matches ONLY the proxy prefix.
  matcher: ['/((?!api|_next|_vercel|supa/|auth/callback|.*\\..*).*)'],
};
