import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { sendConfirmationEmail } from "@/lib/newsletter/mail";

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

  const token = randomBytes(32).toString("base64url");
  const rows = await sql.query(
    `INSERT INTO newsletter_subscribers (id, email, normalized_email, status, consent_at, confirm_token_hash, confirm_sent_at)
     VALUES ($1, $2, $2, 'pending', now(), $3, now())
     ON CONFLICT (normalized_email) DO UPDATE SET
       email = EXCLUDED.email,
       status = CASE WHEN newsletter_subscribers.status = 'subscribed' THEN 'subscribed' ELSE 'pending' END,
       consent_at = CASE WHEN newsletter_subscribers.status = 'subscribed' THEN newsletter_subscribers.consent_at ELSE now() END,
       confirm_token_hash = CASE WHEN newsletter_subscribers.status = 'subscribed' THEN newsletter_subscribers.confirm_token_hash ELSE EXCLUDED.confirm_token_hash END,
       confirm_sent_at = CASE WHEN newsletter_subscribers.status = 'subscribed' THEN newsletter_subscribers.confirm_sent_at ELSE now() END,
       unsubscribed_at = NULL,
       updated_at = now()
     WHERE newsletter_subscribers.status <> 'pending' OR newsletter_subscribers.confirm_sent_at IS NULL OR newsletter_subscribers.confirm_sent_at < now() - interval '2 minutes'
     RETURNING status`,
    [randomUUID(), email, hashToken(token)],
  );
  // Sem linha: já havia um pedido pendente há menos de 2 minutos. Já inscrito: não reenvia nada.
  if ((rows[0] as { status: string } | undefined)?.status === "pending") await sendConfirmationEmail(email, token);
  return "saved";
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function confirmNewsletterToken(token: string): Promise<"confirmed" | "invalid"> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return "invalid";
  const rows = await getDb().query(
    `UPDATE newsletter_subscribers SET status = 'subscribed', confirm_token_hash = NULL, updated_at = now()
     WHERE confirm_token_hash = $1 AND status = 'pending' AND confirm_sent_at > now() - interval '48 hours'
     RETURNING id`,
    [hashToken(token)],
  );
  return rows.length ? "confirmed" : "invalid";
}
