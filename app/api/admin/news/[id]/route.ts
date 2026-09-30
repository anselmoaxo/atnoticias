import { requireAdminApi } from "@/lib/admin";
import { categories } from "@/lib/content";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
const allowedStatus = new Set(["published", "archived"]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Notícia não encontrada." }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Envie dados válidos." }, { status: 400 }); }
  if (!body || typeof body !== "object") return Response.json({ error: "Envie dados válidos." }, { status: 400 });
  const data = body as Record<string, unknown>;
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const summary = typeof data.summary === "string" ? data.summary.trim() : "";
  const category = typeof data.category === "string" ? data.category : "";
  const author = typeof data.author === "string" ? data.author.trim() : "";
  const imageUrl = typeof data.imageUrl === "string" ? data.imageUrl.trim() : "";
  const publishedAt = typeof data.publishedAt === "string" ? data.publishedAt : "";
  const status = typeof data.status === "string" ? data.status : "";
  if (title.length < 5 || title.length > 240) return Response.json({ error: "O título precisa ter entre 5 e 240 caracteres." }, { status: 400 });
  if (!summary.length || summary.length > 900) return Response.json({ error: "A descrição precisa ter até 900 caracteres." }, { status: 400 });
  if (!categories.some((item) => item.name === category)) return Response.json({ error: "Escolha uma categoria válida." }, { status: 400 });
  if (author.length > 160) return Response.json({ error: "O nome do autor é muito longo." }, { status: 400 });
  if (imageUrl) {
    try { if (new URL(imageUrl).protocol !== "https:") throw new Error(); }
    catch { return Response.json({ error: "A imagem precisa usar uma URL HTTPS válida." }, { status: 400 }); }
  }
  if (!publishedAt || Number.isNaN(new Date(publishedAt).getTime())) return Response.json({ error: "Informe uma data válida." }, { status: 400 });
  if (!allowedStatus.has(status)) return Response.json({ error: "Escolha um status válido." }, { status: 400 });
  try {
    const sql = getDb();
    const rows = await sql.query(
      "UPDATE news_articles SET title = $2, summary = $3, category = $4, author = $5, image_url = $6, published_at = $7, status = $8, updated_at = now() WHERE id = $1 RETURNING id",
      [id, title, summary, category, author || null, imageUrl || null, new Date(publishedAt).toISOString(), status],
    );
    if (!rows.length) return Response.json({ error: "Notícia não encontrada." }, { status: 404 });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Não foi possível salvar as alterações." }, { status: 503 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Notícia não encontrada." }, { status: 404 });
  try {
    const sql = getDb();
    await sql.query("DELETE FROM news_articles WHERE id = $1", [id]);
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Não foi possível excluir a notícia." }, { status: 503 });
  }
}
