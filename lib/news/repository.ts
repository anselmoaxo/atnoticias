import { getDb } from "@/lib/db";
import type { NewsArticle } from "@/lib/content";
import { stripPromotions } from "@/lib/news/promotions";

// Só exibe notícias de fontes cadastradas no painel (desativar a coleta de uma fonte não esconde o que já foi publicado).
const knownSource = "EXISTS (SELECT 1 FROM news_sources s WHERE s.id = news_articles.source_id)";

// Limpa também na leitura, para as notícias gravadas antes do filtro de divulgação.
function publicArticle(row: unknown): NewsArticle {
  const article = row as NewsArticle;
  return { ...article, summary: stripPromotions(article.summary) };
}

const articleFields = `id, slug, title, summary, category, author, image_url,
  source_name, source_url, published_at, views, status, source_type, language, image_credit, relevance`;

export async function listPublishedNews(category?: string): Promise<NewsArticle[]> {
  const sql = getDb();
  const rows = category
    ? await sql.query(`SELECT ${articleFields} FROM news_articles WHERE status = 'published' AND ${knownSource} AND category = $1 ORDER BY published_at DESC LIMIT 60`, [category])
    : await sql.query(`SELECT ${articleFields} FROM news_articles WHERE status = 'published' AND ${knownSource} ORDER BY published_at DESC LIMIT 60`);
  return rows.map(publicArticle);
}

export async function listPopularNews(): Promise<NewsArticle[]> {
  const sql = getDb();
  const rows = await sql.query(`SELECT ${articleFields} FROM news_articles WHERE status = 'published' AND ${knownSource} ORDER BY views DESC, published_at DESC LIMIT 5`);
  return rows.map(publicArticle);
}

export async function getNewsBySlug(slug: string): Promise<NewsArticle | null> {
  const sql = getDb();
  const rows = await sql.query(`SELECT ${articleFields} FROM news_articles WHERE slug = $1 AND status = 'published' AND ${knownSource} LIMIT 1`, [slug]);
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
