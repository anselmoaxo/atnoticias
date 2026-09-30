import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

loadEnvConfig(process.cwd());

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não está configurada.");
  const migration = await readFile(resolve(process.cwd(), "db/migrations/001_news_articles.sql"), "utf8");
  const statements = migration.split(";").map((statement) => statement.trim()).filter(Boolean);
  const sql = neon(connectionString);
  for (const statement of statements) await sql.query(statement);
  console.log("Migração de notícias aplicada com sucesso.");
}

main().catch((error: unknown) => {
  console.error("Falha ao aplicar a migração:", error instanceof Error ? error.name : "erro desconhecido");
  process.exitCode = 1;
});
