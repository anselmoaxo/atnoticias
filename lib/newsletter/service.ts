import { createHmac, randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";

export function normalizeNewsletterEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLocaleLowerCase("en-US");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export async function registerNewsletterEmail(email: string, clientAddress: string): Promise<"saved" | "rate-limited"> {
  const secret = process.env.NEWSLETTER_RATE_LIMIT_SECRET || process.env.CRON_SECRET || process.env.NEON_AUTH_COOKIE_SECRET || process.env.DATABASE_URL;
  if (!secret || secret.length < 32) throw new Error("RateLimitSecretUnavailable");
  const clientKey = createHmac("sha256", secret).update(`newsletter-signup:${clientAddress}`).digest("hex");
  const sql = getDb();

  await sql.query("DELETE FROM newsletter_signup_limits WHERE updated_at < now() - interval '48 hours'");
  const attempts = await sql.query(
    `INSERT INTO newsletter_signup_limits (client_key, window_started_at, attempts)
     VALUES ($1, now(), 1)
     ON CONFLICT (client_key) DO UPDATE SET
       attempts = CASE WHEN newsletter_signup_limits.window_started_at < now() - interval '1 hour' THEN 1 ELSE newsletter_signup_limits.attempts + 1 END,
       window_started_at = CASE WHEN newsletter_signup_limits.window_started_at < now() - interval '1 hour' THEN now() ELSE newsletter_signup_limits.window_started_at END,
       updated_at = now()
     RETURNING attempts`,
    [clientKey],
  );
  if (Number((attempts[0] as { attempts: number } | undefined)?.attempts ?? 0) > 8) return "rate-limited";

  await sql.query(
    `INSERT INTO newsletter_subscribers (id, email, normalized_email, status, consent_at)
     VALUES ($1, $2, $2, 'subscribed', now())
     ON CONFLICT (normalized_email) DO UPDATE SET
       email = EXCLUDED.email,
       status = 'subscribed',
       consent_at = now(),
       updated_at = now(),
       unsubscribed_at = NULL`,
    [randomUUID(), email],
  );
  return "saved";
}
