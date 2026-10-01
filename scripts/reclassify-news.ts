import { loadEnvConfig } from "@next/env";
import { getDb } from "@/lib/db";
import { categoryFor } from "@/lib/news/importer";

loadEnvConfig(process.cwd());

async function main() {
  const sql = getDb();
  const rows = await sql.query(
    "SELECT id, title, summary, category FROM news_articles WHERE updated_at = imported_at",
  ) as unknown as Array<{ id: string; title: string; summary: string; category: string }>;
  let changed = 0;
  for (const article of rows) {
    const nextCategory = categoryFor(`${article.title} ${article.summary}`);
    if (nextCategory === article.category) continue;
    await sql.query("UPDATE news_articles SET category = $2, updated_at = now() WHERE id = $1 AND updated_at = imported_at", [article.id, nextCategory]);
    changed += 1;
  }
  console.log(JSON.stringify({ reviewed: rows.length, reclassified: changed }));
}

main().catch((error: unknown) => {
  console.error("Falha ao corrigir categorias:", error instanceof Error ? error.name : "erro desconhecido");
  process.exitCode = 1;
});
