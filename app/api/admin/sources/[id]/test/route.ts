import { requireAdminApi } from "@/lib/admin";
import { getDb } from "@/lib/db";
import { readCollectorSettings, testSource } from "@/lib/news/importer";
import { sourceFromRow, type SourceRow } from "@/lib/news/sources";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await context.params;
  if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(id)) return Response.json({ error: "Fonte não encontrada." }, { status: 404 });
  try {
    const sql = getDb();
    const rows = await sql.query(
      `SELECT id, name, site_url, kind, feed_url, path_prefix, source_type, language, default_category, enabled, use_images, max_items, notes,
        etag, last_modified FROM news_sources WHERE id = $1`, [id],
    ) as SourceRow[];
    if (!rows.length) return Response.json({ error: "Fonte não encontrada." }, { status: 404 });
    const settings = await readCollectorSettings(sql);
    return Response.json(await testSource(sourceFromRow(rows[0]), settings.max_age_hours), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível testar a fonte." }, { status: 503 });
  }
}
