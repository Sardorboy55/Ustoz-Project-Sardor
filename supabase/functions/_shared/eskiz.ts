// Eskiz.uz SMS client (docs/07 §7.5).
// Bearer token lives ~30 days; cached in-memory per worker, re-login on 401.

const ESKIZ_BASE = "https://notify.eskiz.uz/api";

let cachedToken: string | null = null;

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${ESKIZ_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`eskiz login failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  const token = json?.data?.token;
  if (!token) throw new Error("eskiz login: no token in response");
  cachedToken = token;
  return token;
}

export interface EskizConfig {
  email: string;
  password: string;
  from?: string; // sender alpha-name, '4546' is the shared test sender
}

/** Sends one SMS. Returns the provider message id when available. */
export async function sendEskizSms(
  cfg: EskizConfig,
  phone: string, // digits only, e.g. 998901234567
  message: string,
): Promise<string | null> {
  const token = cachedToken ?? (await login(cfg.email, cfg.password));

  const attempt = async (bearer: string) =>
    fetch(`${ESKIZ_BASE}/message/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify({
        mobile_phone: phone,
        message,
        from: cfg.from ?? "4546",
      }),
    });

  let res = await attempt(token);
  if (res.status === 401) {
    // token expired — re-login once
    res = await attempt(await login(cfg.email, cfg.password));
  }
  if (!res.ok) {
    throw new Error(`eskiz send failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json().catch(() => null);
  return json?.id ?? null;
}
