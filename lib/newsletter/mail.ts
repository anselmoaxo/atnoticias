import { escapeHtml } from "@/lib/html";

const subject = "Confirme sua inscrição na newsletter da Anselmo Tech Notícias";

export function siteUrl() {
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "";
  return (process.env.NEXT_PUBLIC_SITE_URL || production || "http://localhost:3000").replace(/\/+$/, "");
}

export async function sendConfirmationEmail(to: string, token: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM_EMAIL || process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("ResendNotConfigured");

  const link = `${siteUrl()}/newsletter/confirmar?token=${encodeURIComponent(token)}`;
  const text = `Recebemos um pedido para receber a newsletter da Anselmo Tech Notícias neste e-mail.\n\nPara confirmar, abra o link (válido por 48 horas):\n${link}\n\nSe você não fez esse pedido, ignore esta mensagem. Nada será enviado.`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#12141a;max-width:520px">
<p>Recebemos um pedido para receber a newsletter da Anselmo Tech Notícias neste e-mail.</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#12141a;color:#fff;padding:12px 18px;border-radius:2px;text-decoration:none;font-weight:600">Confirmar inscrição</a></p>
<p style="color:#5e6674;font-size:14px">O link vale por 48 horas. Se você não fez esse pedido, ignore esta mensagem. Nada será enviado.</p>
</div>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });
  if (!response.ok) {
    // O Resend explica o erro em `message` (chave inválida, domínio não verificado etc.).
    const detail = await response.json().then((body: { message?: unknown }) => String(body?.message ?? ""), () => "");
    throw new Error(`ResendFailed:${response.status}${detail ? `:${detail.slice(0, 200)}` : ""}`);
  }
}
