const verifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Nome da ação enviado pelo widget do formulário; o servidor recusa tokens de outra ação. */
export const turnstileAction = "newsletter";

/** Chave pública do widget, ou null. Só vale com as duas chaves configuradas; com uma só, a inscrição funciona como antes. */
export function turnstileSiteKey(): string | null {
  const siteKey = process.env.TURNSTILE_SITE_KEY?.trim();
  return siteKey && process.env.TURNSTILE_SECRET_KEY?.trim() ? siteKey : null;
}

/** Confere o token do Cloudflare Turnstile. Falha fechada: erro de rede ou resposta estranha recusa o envio. */
export async function verifyTurnstile(token: unknown, clientAddress: string, fetcher: typeof fetch = fetch): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret || !turnstileSiteKey()) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (clientAddress && clientAddress !== "unknown") body.set("remoteip", clientAddress);
  try {
    const response = await fetcher(verifyUrl, { method: "POST", body, signal: AbortSignal.timeout(5000) });
    if (!response.ok) return false;
    const data = (await response.json()) as { success?: unknown; action?: unknown };
    return data.success === true && data.action === turnstileAction;
  } catch {
    return false;
  }
}
