import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Next 16: the network-boundary file is `proxy.ts` (ex-middleware), nodejs runtime.
const intl = createIntlMiddleware(routing);

export default function proxy(request: Request) {
  return intl(request as never);
}

export const config = {
  // skip static assets and API routes
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
