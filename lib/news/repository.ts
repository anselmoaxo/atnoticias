import { getDb } from "@/lib/db";
import type { NewsArticle } from "@/lib/content";
import { stripPromotions } from "@/lib/news/promotions";
import { newsSources } from "@/lib/news/sources";

// Só exibe fontes em português do Brasil que ainda estão configuradas.
const activeSources = newsSources.map((source) => source.name);

// Limpa também na leitura, para as notícias gravadas antes do filtro de divulgação.
function publicArticle(row: unknown): NewsArticle {
  const article = row as NewsArticle;
  return { ...article, summary: stripPromotions(article.summary) };
}

const articleFields = `id, slug, title, summary, category, author, image_url,
  source_name, source_url, published_at, views, status`;

export async function listPublishedNews(category?: string): Promise<NewsArticle[]> {
  const sql = getDb();
  const rows = category
    ? await sql.query(`SELECT ${articleFields} FROM news_articles WHERE status = 'published' AND source_name = ANY($2) AND category = $1 ORDER BY published_at DESC LIMIT 60`, [category, activeSources])
    : await sql.query(`SELECT ${articleFields} FROM news_articles WHERE status = 'published' AND source_name = ANY($1) ORDER BY published_at DESC LIMIT 60`, [activeSources]);
  return rows.map(publicArticle);
}

export async function listPopularNews(): Promise<NewsArticle[]> {
  const sql = getDb();
  const rows = await sql.query(`SELECT ${articleFields} FROM news_articles WHERE status = 'published' AND source_name = ANY($1) ORDER BY views DESC, published_at DESC LIMIT 5`, [activeSources]);
  return rows.map(publicArticle);
}

export async function getNewsBySlug(slug: string): Promise<NewsArticle | null> {
  const sql = getDb();
  const rows = await sql.query(`SELECT ${articleFields} FROM news_articles WHERE slug = $1 AND status = 'published' AND source_name = ANY($2) LIMIT 1`, [slug, activeSources]);
  return rows[0] ? publicArticle(rows[0]) : null;
}

export async function incrementNewsView(id: string): Promise<void> {
  const sql = getDb();
  await sql.query("UPDATE news_articles SET views = views + 1 WHERE id = $1 AND status = 'published'", [id]);
}

export async function listAdminNews(): Promise<NewsArticle[]> {
  const sql = getDb();
  const rows = await sql.query(`SELECT ${articleFields} FROM news_articles ORDER BY imported_at DESC LIMIT 250`);
  return rows as NewsArticle[];
}
