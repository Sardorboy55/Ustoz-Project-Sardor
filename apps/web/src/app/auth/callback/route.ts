import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth (Google) возвращает пользователя сюда с ?code=… — меняем код на сессию
// (кладётся в cookie) и ведём на `next`. Маршрут вне [locale] — он не зависит от
// языка, поэтому next-intl его не трогает.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") || "/uz/cabinet";
  const dest = nextParam.startsWith("/") ? nextParam : `/${nextParam}`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }
  return NextResponse.redirect(`${origin}/uz/auth?error=oauth`);
}
