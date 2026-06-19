// interview-audio — отдаёт аудиозапись собеседования из ElevenLabs по
// conversation_id. Доступ только администраторам. Секретный ключ ElevenLabs
// (ELEVENLABS_API_KEY) живёт в Supabase secrets, в браузер не попадает.
//
// Самодостаточная (без импортов из _shared), чтобы её можно было задеплоить
// прямо из дашборда Supabase копипастом, без CLI.

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function err(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  // SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY Supabase подставляет в функции сам.
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // Кто вызывает — берём из JWT.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return err(401, "UNAUTHENTICATED", "Требуется авторизация.");
  const { data: u } = await admin.auth.getUser(token);
  if (!u?.user) return err(401, "UNAUTHENTICATED", "Сессия недействительна.");

  // Только админ.
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", u.user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    return err(403, "FORBIDDEN", "Доступ только для администраторов.");
  }

  let conversationId = "";
  try {
    const body = await req.json();
    conversationId = String(body?.conversation_id ?? "").trim();
  } catch {
    return err(400, "BAD_REQUEST", "Нужен conversation_id.");
  }
  if (!conversationId) return err(400, "BAD_REQUEST", "Нужен conversation_id.");

  const key = Deno.env.get("ELEVENLABS_API_KEY");
  if (!key) return err(500, "NO_KEY", "ELEVENLABS_API_KEY не задан в секретах Supabase.");

  const r = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(conversationId)}/audio`,
    { headers: { "xi-api-key": key } },
  );
  if (!r.ok) {
    console.error("elevenlabs audio fetch failed:", r.status, conversationId);
    return err(
      r.status === 404 ? 404 : 502,
      "ELEVENLABS_ERROR",
      r.status === 404
        ? "Запись не найдена (возможно, ещё обрабатывается)."
        : `ElevenLabs вернул ${r.status}.`,
    );
  }

  const audio = await r.arrayBuffer();
  return new Response(audio, {
    status: 200,
    headers: { "Content-Type": "audio/mpeg", ...CORS },
  });
});
