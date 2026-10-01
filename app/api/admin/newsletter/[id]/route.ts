import { requireAdminApi } from "@/lib/admin";
import { deleteNewsletterSubscriber, updateNewsletterStatus, type NewsletterStatus } from "@/lib/newsletter/repository";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Inscrito não encontrado." }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Envie dados válidos." }, { status: 400 }); }
  const status = body && typeof body === "object" ? (body as Record<string, unknown>).status : null;
  if (status !== "subscribed" && status !== "unsubscribed") return Response.json({ error: "Escolha um status válido." }, { status: 400 });
  try {
    const updated = await updateNewsletterStatus(id, status as NewsletterStatus);
    return updated ? Response.json({ success: true }) : Response.json({ error: "Inscrito não encontrado." }, { status: 404 });
  } catch {
    return Response.json({ error: "Não foi possível atualizar o inscrito." }, { status: 503 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Inscrito não encontrado." }, { status: 404 });
  try {
    const deleted = await deleteNewsletterSubscriber(id);
    return deleted ? Response.json({ success: true }) : Response.json({ error: "Inscrito não encontrado." }, { status: 404 });
  } catch {
    return Response.json({ error: "Não foi possível excluir o inscrito." }, { status: 503 });
  }
}
