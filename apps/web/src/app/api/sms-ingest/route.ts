// Приём SMS от телефона-форвардера (Paynet). Гибко принимает token+sms из
// query, JSON или сырого тела. Вызывает RPC ingest_payment_sms (она проверяет
// токен и сама подтверждает оплату по уникальной сумме). Ключ — anon (защита
// внутри функции по токену).

import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const raw = await req.text().catch(() => "");

  let token = url.searchParams.get("token") ?? "";
  let sms =
    url.searchParams.get("sms") ??
    url.searchParams.get("message") ??
    url.searchParams.get("text") ??
    "";

  if (raw) {
    try {
      const j = JSON.parse(raw) as Record<string, unknown>;
      if (!token) token = String(j.token ?? j.secret ?? "");
      if (!sms) sms = String(j.sms ?? j.message ?? j.text ?? j.body ?? "");
    } catch {
      // тело не JSON — считаем его текстом SMS
      if (!sms) sms = raw;
    }
  }

  if (!token || !sms) {
    return Response.json({ ok: false, error: "missing token or sms" }, { status: 400 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
  const { data, error } = await supabase.rpc("ingest_payment_sms", {
    p_token: token,
    p_sms: sms,
  });
  if (error) {
    // Не раскрываем детали наружу; форвардеру достаточно 200.
    return Response.json({ ok: false }, { status: 200 });
  }
  return Response.json({ ok: true, result: data });
}
