import { normalizeNewsletterEmail, registerNewsletterEmail } from "@/lib/newsletter/service";

export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 4096) return Response.json({ error: "O formulário enviado é muito grande." }, { status: 413, headers: noStore });

  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Não foi possível ler o formulário." }, { status: 400, headers: noStore }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ error: "Confira os dados do formulário." }, { status: 400, headers: noStore });

  const data = body as Record<string, unknown>;
  if (typeof data.website === "string" && data.website.trim()) {
    return Response.json({ message: "Inscrição salva. O envio de e-mails será ativado mais adiante." }, { headers: noStore });
  }
  const email = normalizeNewsletterEmail(data.email);
  if (!email) return Response.json({ error: "Confira o endereço de e-mail e tente novamente." }, { status: 400, headers: noStore });
  if (data.consent !== true) return Response.json({ error: "Marque a autorização para receber as novidades." }, { status: 400, headers: noStore });

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientAddress = request.headers.get("x-real-ip")?.trim() || forwarded || "unknown";
  try {
    const result = await registerNewsletterEmail(email, clientAddress);
    if (result === "rate-limited") {
      return Response.json({ error: "Muitas tentativas. Aguarde uma hora e tente novamente." }, { status: 429, headers: { ...noStore, "Retry-After": "3600" } });
    }
    return Response.json({ message: "Inscrição salva com sucesso. O envio de e-mails será ativado mais adiante." }, { headers: noStore });
  } catch {
    return Response.json({ error: "Não foi possível salvar sua inscrição agora. Tente novamente mais tarde." }, { status: 503, headers: noStore });
  }
}
