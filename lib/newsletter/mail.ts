import { escapeHtml } from "@/lib/html";

const subject = "Confirme sua inscrição na newsletter da Anselmo Tech Notícias";

export function siteUrl() {
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "";
  return (process.env.NEXT_PUBLIC_SITE_URL || production || "http://localhost:3000").replace(/\/+$/, "");
}

/** E-mail em tabelas e estilos inline, o formato que Gmail, Outlook e Apple Mail exibem igual. */
export function confirmationHtml(link: string) {
  const href = escapeHtml(link);
  const home = escapeHtml(siteUrl());
  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f5f7">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Falta um clique para receber as principais notícias de tecnologia.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#12141a">
<tr><td style="padding:0 4px 20px;font-size:16px;font-weight:700">
<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#2b3fe0;vertical-align:middle;margin-right:8px"></span>Anselmo Tech <span style="font-weight:400;color:#5e6674">Notícias</span>
</td></tr>
<tr><td style="background:#ffffff;border-radius:6px;border-top:4px solid #2b3fe0;padding:36px 32px">
<h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;font-weight:700;letter-spacing:-0.5px">Confirme sua inscrição</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2a303c">Recebemos um pedido para enviar a newsletter da Anselmo Tech Notícias para este e-mail. Você vai receber as principais notícias de programação, inteligência artificial, dados e tecnologia.</p>
<p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#2a303c">Para ativar, é só clicar no botão abaixo.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:4px;background:#2b3fe0">
<a href="${href}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:4px">Confirmar inscrição</a>
</td></tr></table>
<p style="margin:28px 0 6px;font-size:13px;line-height:1.5;color:#5e6674">Se o botão não funcionar, copie e cole este endereço no navegador:</p>
<p style="margin:0;font-size:13px;line-height:1.5;word-break:break-all"><a href="${href}" style="color:#2b3fe0">${href}</a></p>
</td></tr>
<tr><td style="padding:20px 4px 0;font-size:13px;line-height:1.6;color:#5e6674">
O link vale por 48 horas e só pode ser usado uma vez. Se você não fez esse pedido, ignore esta mensagem: sem a confirmação, nada será enviado.<br>
<a href="${home}" style="color:#5e6674">${home.replace(/^https?:\/\//, "")}</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export async function sendConfirmationEmail(to: string, token: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM_EMAIL || process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("ResendNotConfigured");

  const link = `${siteUrl()}/newsletter/confirmar?token=${encodeURIComponent(token)}`;
  const text = `Recebemos um pedido para receber a newsletter da Anselmo Tech Notícias neste e-mail.\n\nPara confirmar, abra o link (válido por 48 horas):\n${link}\n\nSe você não fez esse pedido, ignore esta mensagem. Nada será enviado.`;
  const html = confirmationHtml(link);

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
