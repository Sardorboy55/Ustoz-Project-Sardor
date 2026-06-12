// deno test --allow-env --allow-net supabase/functions/sms-hook/index_test.ts
import { assertEquals } from "jsr:@std/assert@1";
import { Webhook } from "npm:standardwebhooks@1.0.0";

const SECRET_B64 = btoa("test-secret-for-sms-hook-unit-tests!");
Deno.env.set("SEND_SMS_HOOK_SECRET", `v1,whsec_${SECRET_B64}`);
Deno.env.set("SMS_MODE", "mock");

const { handleSmsHook } = await import("./handler.ts");

function signedRequest(body: unknown): Request {
  const payload = JSON.stringify(body);
  const id = "msg_test";
  const ts = new Date();
  const wh = new Webhook(SECRET_B64);
  const signature = wh.sign(id, ts, payload);
  return new Request("http://localhost/sms-hook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "webhook-id": id,
      "webhook-timestamp": Math.floor(ts.getTime() / 1000).toString(),
      "webhook-signature": signature,
    },
    body: payload,
  });
}

Deno.test("rejects non-POST", async () => {
  const res = await handleSmsHook(new Request("http://localhost/", { method: "GET" }));
  assertEquals(res.status, 405);
});

Deno.test("rejects bad signature", async () => {
  const res = await handleSmsHook(
    new Request("http://localhost/", {
      method: "POST",
      headers: {
        "webhook-id": "x",
        "webhook-timestamp": Math.floor(Date.now() / 1000).toString(),
        "webhook-signature": "v1,invalid",
      },
      body: JSON.stringify({ user: { phone: "998901234567" }, sms: { otp: "123456" } }),
    }),
  );
  assertEquals(res.status, 401);
});

Deno.test("rejects valid signature with missing fields", async () => {
  const res = await handleSmsHook(signedRequest({ user: {}, sms: {} }));
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error.code, "BAD_PAYLOAD");
});
