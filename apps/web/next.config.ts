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
      // Прокси Supabase: /supa/* → обработчик внутри [locale] (внешние rewrite в
      // этой связке не проксируют, а внутренние — работают). Папка БЕЗ "_": имена
      // с подчёркиванием Next считает приватными и не маршрутизирует. Обработчик
      // форвардит в Supabase. Нужно, т.к. узбекские провайдеры не резолвят
      // *.supabase.co — приложение/сайт ходят на ibilim.uz/supa (резолвится в UZ).
      { source: "/supa/:path*", destination: "/uz/supa/:path*" },
    ];
  },
};

export default withNextIntl(nextConfig);
