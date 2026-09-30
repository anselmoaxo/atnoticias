import { getDb } from "@/lib/db";
import type { NewsArticle } from "@/lib/content";

const articleFields = `id, slug, title, summary, category, author, image_url,
  source_name, source_url, published_at, views, status`;

export async function listPublishedNews(category?: string): Promise<NewsArticle[]> {
  const sql = getDb();
  const rows = category
    ? await sql.query(`SELECT ${articleFields} FROM news_articles WHERE status = 'published' AND category = $1 ORDER BY published_at DESC LIMIT 60`, [category])
    : await sql.query(`SELECT ${articleFields} FROM news_articles WHERE status = 'published' ORDER BY published_at DESC LIMIT 60`);
  return rows as NewsArticle[];
}

export async function listPopularNews(): Promise<NewsArticle[]> {
  const sql = getDb();
  const rows = await sql.query(`SELECT ${articleFields} FROM news_articles WHERE status = 'published' ORDER BY views DESC, published_at DESC LIMIT 5`);
  return rows as NewsArticle[];
}

export async function getNewsBySlug(slug: string): Promise<NewsArticle | null> {
  const sql = getDb();
  const rows = await sql.query(`SELECT ${articleFields} FROM news_articles WHERE slug = $1 AND status = 'published' LIMIT 1`, [slug]);
  return (rows[0] as NewsArticle | undefined) ?? null;
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
