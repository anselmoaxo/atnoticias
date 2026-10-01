import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

loadEnvConfig(process.cwd());

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não está configurada.");
  const sql = neon(connectionString);
  const directory = resolve(process.cwd(), "db/migrations");
  const files = (await readdir(directory)).filter((file) => /^\d+_[a-z0-9_-]+\.sql$/i.test(file)).sort();
  for (const file of files) {
    const migration = await readFile(resolve(directory, file), "utf8");
    const statements = migration.split(";").map((statement) => statement.trim()).filter(Boolean);
    for (const statement of statements) await sql.query(statement);
    console.log(`Migração aplicada: ${file}`);
  }
}

main().catch((error: unknown) => {
  console.error("Falha ao aplicar a migração:", error instanceof Error ? error.name : "erro desconhecido");
  process.exitCode = 1;
});
