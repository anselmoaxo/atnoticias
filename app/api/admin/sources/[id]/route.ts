import { requireAdminApi } from "@/lib/admin";
import { getDb } from "@/lib/db";
import { parseSourceInput } from "@/lib/news/source-admin";

export const runtime = "nodejs";
const validId = /^[a-z0-9][a-z0-9-]{1,39}$/;

// Aceita o formulário completo ou só { enabled } para ligar e desligar a fonte.
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await context.params;
  if (!validId.test(id)) return Response.json({ error: "Fonte não encontrada." }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Envie dados válidos." }, { status: 400 }); }
  try {
    const sql = getDb();
    const data = body as Record<string, unknown> | null;
    if (data && Object.keys(data).length === 1 && typeof data.enabled === "boolean") {
      const rows = await sql.query("UPDATE news_sources SET enabled = $2, updated_at = now() WHERE id = $1 RETURNING id", [id, data.enabled]);
      return rows.length ? Response.json({ success: true }) : Response.json({ error: "Fonte não encontrada." }, { status: 404 });
    }
    const { input, error } = parseSourceInput(body);
    if (!input) return Response.json({ error }, { status: 400 });
    const rows = await sql.query(
      `UPDATE news_sources SET name = $2, site_url = $3, kind = $4, feed_url = $5, path_prefix = $6, source_type = $7, language = $8,
        default_category = $9, enabled = $10, use_images = $11, max_items = $12, notes = $13, updated_at = now(),
        etag = CASE WHEN feed_url IS DISTINCT FROM $5 THEN NULL ELSE etag END,
        last_modified = CASE WHEN feed_url IS DISTINCT FROM $5 THEN NULL ELSE last_modified END
       WHERE id = $1 RETURNING id`,
      [id, input.name, input.site_url, input.kind, input.feed_url, input.path_prefix, input.source_type, input.language,
        input.default_category, input.enabled, input.use_images, input.max_items, input.notes],
    );
    return rows.length ? Response.json({ success: true }) : Response.json({ error: "Fonte não encontrada." }, { status: 404 });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return Response.json({ error: "Já existe uma fonte com esse nome." }, { status: 409 });
    return Response.json({ error: "Não foi possível salvar a fonte." }, { status: 503 });
  }
}
