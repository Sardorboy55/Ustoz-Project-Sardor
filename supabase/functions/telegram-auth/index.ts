// Telegram Login → Supabase session.
// Получает данные Telegram Login Widget, проверяет подпись бот-токеном,
// создаёт/находит пользователя и выдаёт одноразовый OTP, которым клиент
// (verifyOtp) логинится. Telegram — не нативный провайдер Supabase, поэтому
// делаем кастомно через admin API.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// HMAC-SHA256(message, key) → hex
async function hmacHex(key: Uint8Array, message: string): Promise<string> {
  const k = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(message));
  return toHex(new Uint8Array(sig));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
  if (!botToken) return json(500, { error: "TELEGRAM_BOT_TOKEN not set" });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "bad json" });
  }

  const { hash, ...fields } = body ?? {};
  if (typeof hash !== "string" || !fields.id) {
    return json(400, { error: "missing telegram data" });
  }

  // --- verify Telegram signature ---
  // data_check_string = "key=value" (all fields except hash) sorted, joined \n.
  // secret_key = SHA256(bot_token); valid if HMAC-SHA256(dcs, secret_key) == hash.
  const checkString = Object.keys(fields)
    .sort()
    .map((k) => `${k}=${fields[k as keyof typeof fields]}`)
    .join("\n");
  const secretKey = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(botToken)),
  );
  const computed = await hmacHex(secretKey, checkString);
  if (computed !== hash) return json(401, { error: "bad signature" });

  // freshness: auth_date within 24h (anti-replay)
  const authDate = Number(fields.auth_date ?? 0);
  if (!authDate || Date.now() / 1000 - authDate > 86400) {
    return json(401, { error: "auth data expired" });
  }

  const tgId = String(fields.id);
  const email = `tg${tgId}@telegram.ibilim.uz`;
  const fullName = [fields.first_name, fields.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // create the user if new (ignore "already exists")
  const { error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      name: fullName,
      telegram_id: tgId,
      telegram_username: fields.username ?? null,
      avatar_url: fields.photo_url ?? null,
      provider: "telegram",
    },
  });
  if (createErr && !`${createErr.message}`.toLowerCase().includes("already")) {
    return json(500, { error: `create user failed: ${createErr.message}` });
  }

  // mint a one-time OTP; the client verifies it to get a real session.
  // Пробуем magiclink, при неудаче — recovery (оба отдают email_otp и не
  // требуют SMTP). Если Email-провайдер выключен в Auth — generateLink
  // вернёт явную ошибку, её и пробрасываем для диагностики на клиенте.
  let otp: string | undefined;
  let lastLinkErr: string | undefined;
  for (const type of ["magiclink", "recovery"] as const) {
    const { data: link, error: linkErr } = await admin.auth.admin
      .generateLink({ type, email });
    if (link?.properties?.email_otp) {
      otp = link.properties.email_otp;
      break;
    }
    lastLinkErr = linkErr?.message ?? "no email_otp in link";
  }
  if (!otp) {
    return json(500, { error: `link failed: ${lastLinkErr ?? "no otp"}` });
  }

  return json(200, { email, otp });
});
