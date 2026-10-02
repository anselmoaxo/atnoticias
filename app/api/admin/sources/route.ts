import { requireAdminApi } from "@/lib/admin";
import { getDb } from "@/lib/db";
import { readCollectorSettings } from "@/lib/news/importer";
import { listAdminSources, listRuns, parseSourceInput, sourceIdFor } from "@/lib/news/source-admin";

export const runtime = "nodejs";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    const sql = getDb();
    const [sources, settings, runs] = await Promise.all([listAdminSources(), readCollectorSettings(sql), listRuns()]);
    return Response.json({ sources, settings, runs }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível carregar as fontes. Confira se `npm run db:migrate` já foi executado." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Envie dados válidos." }, { status: 400 }); }
  const { input, error } = parseSourceInput(body);
  if (!input) return Response.json({ error }, { status: 400 });
  try {
    const sql = getDb();
    const rows = await sql.query(
      `INSERT INTO news_sources (id, name, site_url, kind, feed_url, path_prefix, source_type, language, default_category, enabled, use_images, max_items, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT DO NOTHING RETURNING id`,
      [sourceIdFor(input.name), input.name, input.site_url, input.kind, input.feed_url, input.path_prefix, input.source_type, input.language,
        input.default_category, input.enabled, input.use_images, input.max_items, input.notes],
    );
    if (!rows.length) return Response.json({ error: "Já existe uma fonte com esse nome." }, { status: 409 });
    return Response.json({ success: true, id: (rows[0] as { id: string }).id });
  } catch {
    return Response.json({ error: "Não foi possível cadastrar a fonte." }, { status: 503 });
  }
}
