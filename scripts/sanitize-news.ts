import { loadEnvConfig } from "@next/env";
import { getDb } from "@/lib/db";
import { cleanText } from "@/lib/news/importer";

loadEnvConfig(process.cwd());

// Reaplica a limpeza atual do importador às notícias já gravadas (remove HTML que entrou antes da correção).
async function main() {
  const sql = getDb();
  const rows = await sql.query("SELECT id, title, summary, author FROM news_articles") as unknown as Array<{ id: string; title: string; summary: string; author: string | null }>;
  let changed = 0;
  for (const article of rows) {
    const title = cleanText(article.title).slice(0, 240);
    const summary = cleanText(article.summary).slice(0, 900);
    const author = article.author === null ? null : cleanText(article.author).slice(0, 160) || null;
    if (title === article.title && summary === article.summary && author === article.author) continue;
    if (title.length < 5 || !summary) {
      await sql.query("UPDATE news_articles SET status = 'archived', updated_at = now() WHERE id = $1", [article.id]);
    } else {
      await sql.query("UPDATE news_articles SET title = $2, summary = $3, author = $4, updated_at = now() WHERE id = $1", [article.id, title, summary, author]);
    }
    changed += 1;
  }
  console.log(JSON.stringify({ reviewed: rows.length, sanitized: changed }));
}

main().catch((error: unknown) => {
  console.error("Falha ao limpar as notícias:", error instanceof Error ? error.name : "erro desconhecido");
  process.exitCode = 1;
});
