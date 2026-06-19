// Прокси аудиозаписи собеседования из ElevenLabs.
// Ключ ElevenLabs (ELEVENLABS_API_KEY) — серверная env-переменная Vercel
// (НЕ NEXT_PUBLIC), в браузер не попадает. Доступ только админам.

import { createServerClient } from "@supabase/ssr";

// Временная диагностика: показывает, видит ли сервер ключ (без значения).
export function GET(): Response {
  return Response.json({
    hasKey: !!process.env.ELEVENLABS_API_KEY,
    keyLength: (process.env.ELEVENLABS_API_KEY ?? "").length,
    matchingNames: Object.keys(process.env).filter((k) => /eleven/i.test(k)),
  });
}

export async function POST(req: Request): Promise<Response> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) {
    return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  // Клиент с JWT вызывающего — RLS позволит прочитать только свой профиль.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      cookies: { getAll: () => [], setAll: () => {} },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  let conversationId = "";
  try {
    const body = await req.json();
    conversationId = String(body?.conversation_id ?? "").trim();
  } catch {
    return Response.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  if (!conversationId) {
    return Response.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return Response.json({ error: "NO_KEY" }, { status: 500 });
  }

  const r = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(conversationId)}/audio`,
    { headers: { "xi-api-key": key } },
  );
  if (!r.ok) {
    return Response.json(
      { error: r.status === 404 ? "NOT_READY" : "ELEVENLABS_ERROR", status: r.status },
      { status: r.status === 404 ? 404 : 502 },
    );
  }

  return new Response(await r.arrayBuffer(), {
    status: 200,
    headers: { "Content-Type": "audio/mpeg" },
  });
}

