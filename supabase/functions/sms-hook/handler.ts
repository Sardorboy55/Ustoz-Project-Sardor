// Supabase Auth "Send SMS" hook (docs/02, docs/07 section 7.5).
// GoTrue POSTs {user, sms:{otp}} signed with standardwebhooks.
// SMS_MODE=mock -> write to mock_sms + log (local/dev, no Eskiz needed)
// SMS_MODE=live -> send through Eskiz.uz
import { Webhook } from "npm:standardwebhooks@1.0.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEskizSms } from "../_shared/eskiz.ts";

type HookPayload = {
  user?: { phone?: string };
  sms?: { otp?: string };
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleSmsHook(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return json(405, { error: { code: "METHOD_NOT_ALLOWED", message: "POST only" } });
  }

  // env is read per-request so tests can set it before importing
  const hookSecret = Deno.env.get("SEND_SMS_HOOK_SECRET") ?? "";
  const smsMode = (Deno.env.get("SMS_MODE") ?? "mock").toLowerCase();

  const rawBody = await req.text();

  // --- verify standardwebhooks signature ---
  let payload: HookPayload;
  try {
    const base64Secret = hookSecret.replace(/^v1,whsec_/, "");
    const wh = new Webhook(base64Secret);
    payload = wh.verify(rawBody, {
      "webhook-id": req.headers.get("webhook-id") ?? "",
      "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
      "webhook-signature": req.headers.get("webhook-signature") ?? "",
    }) as HookPayload;
  } catch (e) {
    console.error("sms-hook: signature verification failed", e);
    return json(401, { error: { code: "INVALID_SIGNATURE", message: "bad webhook signature" } });
  }

  const phone = payload.user?.phone?.replace(/\D/g, "") ?? "";
  const otp = payload.sms?.otp ?? "";
  if (!phone || !otp) {
    return json(400, { error: { code: "BAD_PAYLOAD", message: "phone/otp missing" } });
  }

  const message = `Vash kod: ${otp}`;

  try {
    if (smsMode === "live") {
      await sendEskizSms(
        {
          email: Deno.env.get("ESKIZ_EMAIL") ?? "",
          password: Deno.env.get("ESKIZ_PASSWORD") ?? "",
        },
        phone,
        message,
      );
      console.log(`sms-hook: sent OTP to ${phone.slice(0, 5)}*** via eskiz`);
    } else {
      // mock: persist so devs/tests can read the code
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { error } = await admin.from("mock_sms").insert({ phone, body: message, otp });
      if (error) throw error;
      console.log(`sms-hook [MOCK]: OTP for ${phone} = ${otp}`);
    }
    return json(200, {});
  } catch (e) {
    console.error("sms-hook: send failed", e);
    return json(500, { error: { code: "SMS_SEND_FAILED", message: String(e) } });
  }
}
