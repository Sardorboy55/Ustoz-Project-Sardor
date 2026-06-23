import type { NextConfig } from "next";
import path from "path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Monorepo root (apps/web → ../..). Pinning it stops Next/Turbopack from
// mis-inferring the workspace root (multiple lockfiles) and fixes file tracing
// for the @ustoz/shared workspace package on Vercel.
const monorepoRoot = path.join(__dirname, "..", "..");

const nextConfig: NextConfig = {
  transpilePackages: ["@ustoz/shared"],
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },
  // OAuth callback lives under [locale] (as-needed locale routing has no
  // middleware, so a bare /auth/callback isn't matched). Supabase redirects to
  // the prefix-less /auth/callback — rewrite it to the default-locale handler.
  async rewrites() {
    return [
      { source: "/auth/callback", destination: "/uz/auth/callback" },
      // Прокси Supabase через наш домен. Узбекские провайдеры не резолвят
      // *.supabase.co (Cloudflare DNS) — приложение/сайт ходят на ibilim.uz/_sb
      // (резолвится в UZ, Vercel), а сервер проксирует в Supabase. Покрывает
      // auth/rest/storage/functions (НЕ realtime — websockets через rewrite не идут).
      {
        source: "/_sb/:path*",
        destination:
          "https://pohlwvzwzcscsyigswod.supabase.co/:path*",
      },
    ];
  },
};

export default withNextIntl(nextConfig);
