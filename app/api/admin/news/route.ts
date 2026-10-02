import { requireAdminApi } from "@/lib/admin";
import { categories } from "@/lib/content";
import { getDb } from "@/lib/db";
import { briefSummary } from "@/lib/news/editorial";
import { cleanText, insertArticle, normalizeSourceUrl, StoryIndex } from "@/lib/news/importer";
import { listAdminNews } from "@/lib/news/repository";

export const runtime = "nodejs";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    return Response.json({ articles: await listAdminNews() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível carregar as notícias." }, { status: 503 });
  }
}

// Cadastro manual: alternativa para fontes que não permitem coleta automática. Mesmas regras de data e duplicidade.
export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Envie dados válidos." }, { status: 400 }); }
  const data = (body ?? {}) as Record<string, unknown>;
  const sourceId = typeof data.sourceId === "string" ? data.sourceId : "";
  const title = typeof data.title === "string" ? cleanText(data.title) : "";
  const summary = typeof data.summary === "string" ? briefSummary(cleanText(data.summary)) : "";
  const url = typeof data.sourceUrl === "string" ? normalizeSourceUrl(data.sourceUrl) : null;
  const category = typeof data.category === "string" ? data.category : "";
  const imageUrl = typeof data.imageUrl === "string" ? data.imageUrl.trim() : "";
  const publishedAt = new Date(typeof data.publishedAt === "string" ? data.publishedAt : "");
  if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(sourceId)) return Response.json({ error: "Escolha a fonte." }, { status: 400 });
  if (title.length < 5 || title.length > 240) return Response.json({ error: "O título precisa ter entre 5 e 240 caracteres." }, { status: 400 });
  if (!summary) return Response.json({ error: "Escreva um resumo curto com suas palavras." }, { status: 400 });
  if (!url || !url.startsWith("https://")) return Response.json({ error: "Informe o link HTTPS da matéria original." }, { status: 400 });
  if (!categories.some((item) => item.name === category)) return Response.json({ error: "Escolha uma categoria válida." }, { status: 400 });
  if (Number.isNaN(publishedAt.getTime())) return Response.json({ error: "Informe a data original de publicação." }, { status: 400 });
  if (publishedAt.getTime() > Date.now() + 60 * 60 * 1000) return Response.json({ error: "A data de publicação não pode estar no futuro." }, { status: 400 });
  if (imageUrl) {
    try { if (new URL(imageUrl).protocol !== "https:") throw new Error(); }
    catch { return Response.json({ error: "A imagem precisa usar uma URL HTTPS válida." }, { status: 400 }); }
  }
  try {
    const sql = getDb();
    const rows = await sql.query("SELECT id, name, source_type, language, default_category, use_images FROM news_sources WHERE id = $1", [sourceId]) as
      Array<{ id: string; name: string; source_type: "editorial" | "official"; language: "pt-BR" | "en"; default_category: string; use_images: boolean }>;
    if (!rows.length) return Response.json({ error: "Fonte não encontrada." }, { status: 404 });
    const source = rows[0];
    const result = await insertArticle(sql, {
      id: source.id, name: source.name, sourceType: source.source_type, language: source.language, defaultCategory: source.default_category, useImages: true,
    }, { title, summary, url, publishedAt, category, imageUrl: imageUrl || null }, await StoryIndex.load(sql));
    if (result === "duplicate") return Response.json({ error: "Esta notícia já está cadastrada (mesmo link ou mesmo anúncio com outro título)." }, { status: 409 });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Não foi possível cadastrar a notícia." }, { status: 503 });
  }
}
