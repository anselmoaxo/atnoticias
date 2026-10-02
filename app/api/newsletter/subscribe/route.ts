import { normalizeNewsletterEmail, registerNewsletterEmail } from "@/lib/newsletter/service";
import { clientAddressFrom } from "@/lib/rate-limit";

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
    return Response.json({ message: "Enviamos um e-mail de confirmação. Abra a mensagem e clique no link para ativar a inscrição." }, { headers: noStore });
  }
  const email = normalizeNewsletterEmail(data.email);
  if (!email) return Response.json({ error: "Confira o endereço de e-mail e tente novamente." }, { status: 400, headers: noStore });
  if (data.consent !== true) return Response.json({ error: "Marque a autorização para receber as novidades." }, { status: 400, headers: noStore });

  try {
    const result = await registerNewsletterEmail(email, clientAddressFrom(request.headers));
    // Só o motivo vai para o log, nunca o endereço. A resposta é a mesma em todos os casos,
    // para não revelar quem já está inscrito.
    console.info(`Newsletter: inscrição ${result}`);
    if (result === "rate-limited") {
      return Response.json({ error: "Muitas tentativas. Aguarde uma hora e tente novamente." }, { status: 429, headers: { ...noStore, "Retry-After": "3600" } });
    }
    return Response.json({ message: "Enviamos um e-mail de confirmação. Abra a mensagem e clique no link para ativar a inscrição." }, { headers: noStore });
  } catch (error) {
    console.error("Newsletter: falha na inscrição:", error instanceof Error ? error.message : "erro desconhecido");
    return Response.json({ error: "Não foi possível salvar sua inscrição agora. Tente novamente mais tarde." }, { status: 503, headers: noStore });
  }
}
