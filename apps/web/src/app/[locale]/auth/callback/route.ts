import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const LOCALES = ["uz", "ru", "en"];

// OAuth (Google) возвращает сюда с ?code=… — меняем код на сессию (cookie) и
// ведём на `next`. Лежит внутри [locale] (иначе при localePrefix:'as-needed' без
// middleware путь не ловится). Внешний `/auth/callback` сюда направляет rewrite
// в next.config.ts, поэтому разрешённый в Supabase адрес остаётся прежним.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const lang = LOCALES.includes(locale) ? locale : "uz";
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // `next` — относительный путь без локали (напр. /cabinet); префиксуем локалью.
  const raw = searchParams.get("next") || "/cabinet";
  const path = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/cabinet";
  const firstSeg = path.split("/")[1];
  const cleanPath = LOCALES.includes(firstSeg)
    ? path.slice(firstSeg.length + 1) || "/"
    : path;
  const dest = `${origin}/${lang}${cleanPath}`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(dest);
  }
  return NextResponse.redirect(`${origin}/${lang}/auth?error=oauth`);
}
