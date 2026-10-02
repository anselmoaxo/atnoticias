import { unsubscribeNewsletterToken } from "@/lib/newsletter/service";

export const runtime = "nodejs";

// Cancelamento em um clique (RFC 8058): Gmail e Yahoo fazem POST na URL do cabeçalho List-Unsubscribe.
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  try {
    const result = await unsubscribeNewsletterToken(token);
    console.info(`Newsletter: cancelamento ${result}`);
    return new Response(null, { status: result === "unsubscribed" ? 200 : 404, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Newsletter: falha no cancelamento:", error instanceof Error ? error.message : "erro desconhecido");
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
