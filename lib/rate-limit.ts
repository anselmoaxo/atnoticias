import { createHmac } from "node:crypto";
import { getDb } from "@/lib/db";
import { readSecret } from "@/lib/secrets";

export function rateLimitSecret(): string {
  // NEWSLETTER_RATE_LIMIT_SECRET é o nome antigo, aceito para não quebrar ambientes já configurados.
  const secret = readSecret("RATE_LIMIT_SECRET", "NEWSLETTER_RATE_LIMIT_SECRET");
  if (!secret) throw new Error("RateLimitSecretUnavailable");
  return secret;
}

export function rateLimitKey(scope: string, clientAddress: string): string {
  return createHmac("sha256", rateLimitSecret()).update(`${scope}:${clientAddress}`).digest("hex");
}

/** Conta uma tentativa e informa se o cliente passou do limite na janela. */
export async function consumeRateLimit(scope: string, clientAddress: string, maxAttempts: number, windowMinutes: number): Promise<boolean> {
  const sql = getDb();
  await sql.query("DELETE FROM rate_limits WHERE updated_at < now() - interval '2 days'");
  const rows = await sql.query(
    `INSERT INTO rate_limits (scope, client_key, window_started_at, attempts)
     VALUES ($1, $2, now(), 1)
     ON CONFLICT (scope, client_key) DO UPDATE SET
       attempts = CASE WHEN rate_limits.window_started_at < now() - make_interval(mins => $3) THEN 1 ELSE rate_limits.attempts + 1 END,
       window_started_at = CASE WHEN rate_limits.window_started_at < now() - make_interval(mins => $3) THEN now() ELSE rate_limits.window_started_at END,
       updated_at = now()
     RETURNING attempts`,
    [scope, rateLimitKey(scope, clientAddress), windowMinutes],
  );
  return Number((rows[0] as { attempts: number } | undefined)?.attempts ?? 0) <= maxAttempts;
}

export function clientAddressFrom(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return headers.get("x-real-ip")?.trim() || forwarded || "unknown";
}
