// Анализ собеседования из ElevenLabs: оценка ИИ, итог разговора, критерии.
// Ключ ElevenLabs (ELEVENLABS_API_KEY) — серверная env Vercel. Только админам.

import { createServerClient } from "@supabase/ssr";

type Analysis = {
  call_successful?: string;
  transcript_summary?: string;
  evaluation_criteria_results?: Record<
    string,
    { criteria_id?: string; result?: string; rationale?: string }
  >;
  data_collection_results?: Record<
    string,
    { data_collection_id?: string; value?: unknown; rationale?: string }
  >;
};

export async function POST(req: Request): Promise<Response> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });

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
  if (!user) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) return Response.json({ error: "FORBIDDEN" }, { status: 403 });

  let conversationId = "";
  try {
    conversationId = String(((await req.json()) as { conversation_id?: string })?.conversation_id ?? "").trim();
  } catch {
    return Response.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  if (!conversationId) return Response.json({ error: "BAD_REQUEST" }, { status: 400 });

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return Response.json({ error: "NO_KEY" }, { status: 500 });

  const r = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(conversationId)}`,
    { headers: { "xi-api-key": key } },
  );
  if (!r.ok) {
    return Response.json(
      { error: r.status === 404 ? "NOT_READY" : "ELEVENLABS_ERROR", status: r.status },
      { status: r.status === 404 ? 404 : 502 },
    );
  }

  const conv = (await r.json()) as { analysis?: Analysis };
  const a = conv.analysis ?? {};

  const criteria = Object.values(a.evaluation_criteria_results ?? {}).map((c) => ({
    name: c.criteria_id ?? "",
    pass: c.result === "success",
    rationale: c.rationale ?? "",
  }));

  // Оценка 0–100: 1) из data collection (числовое поле score/rating), иначе
  // 2) доля пройденных критериев, иначе null.
  let score: number | null = null;
  for (const d of Object.values(a.data_collection_results ?? {})) {
    const n = Number(d.value);
    if (Number.isFinite(n) && n >= 0 && n <= 100) {
      score = Math.round(n);
      break;
    }
  }
  if (score === null && criteria.length > 0) {
    score = Math.round((criteria.filter((c) => c.pass).length / criteria.length) * 100);
  }

  return Response.json({
    score,
    callSuccessful: a.call_successful ?? "unknown",
    summary: a.transcript_summary ?? "",
    criteria,
  });
}
