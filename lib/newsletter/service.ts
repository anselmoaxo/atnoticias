import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { sendConfirmationEmail } from "@/lib/newsletter/mail";
import { rateLimitKey } from "@/lib/rate-limit";

export function normalizeNewsletterEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLocaleLowerCase("en-US");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export async function registerNewsletterEmail(email: string, clientAddress: string): Promise<"saved" | "rate-limited"> {
  const clientKey = rateLimitKey("newsletter-signup", clientAddress);
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
  // Só o pedido é registrado aqui. Status, consentimento e cancelamento de um endereço que já existe
  // mudam apenas quando o dono do e-mail confirma o link (confirmNewsletterToken).
  const rows = await sql.query(
    `INSERT INTO newsletter_subscribers (id, email, normalized_email, status, consent_at, confirm_token_hash, confirm_sent_at)
     VALUES ($1, $2, $2, 'pending', now(), $3, now())
     ON CONFLICT (normalized_email) DO UPDATE SET
       confirm_token_hash = EXCLUDED.confirm_token_hash,
       confirm_sent_at = now(),
       updated_at = now()
     WHERE newsletter_subscribers.status <> 'subscribed'
       AND (newsletter_subscribers.confirm_sent_at IS NULL OR newsletter_subscribers.confirm_sent_at < now() - interval '2 minutes')
     RETURNING id`,
    [randomUUID(), email, hashToken(token)],
  );
  // Sem linha: já inscrito ou pedido enviado há menos de 2 minutos. Nada é reenviado.
  if (rows.length) await sendConfirmationEmail(email, token);
  return "saved";
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function confirmNewsletterToken(token: string): Promise<"confirmed" | "invalid"> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return "invalid";
  const rows = await getDb().query(
    `UPDATE newsletter_subscribers
     SET status = 'subscribed', consent_at = now(), unsubscribed_at = NULL, confirm_token_hash = NULL, updated_at = now()
     WHERE confirm_token_hash = $1 AND status IN ('pending', 'unsubscribed') AND confirm_sent_at > now() - interval '48 hours'
     RETURNING id`,
    [hashToken(token)],
  );
  return rows.length ? "confirmed" : "invalid";
}
