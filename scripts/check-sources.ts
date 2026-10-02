import { appendFileSync } from "node:fs";
import { testSource } from "@/lib/news/importer";
import { defaultSources } from "@/lib/news/sources";

// Verifica as fontes iniciais sem tocar no banco: responde? o robots.txt permite? traz notícias recentes com data?
async function main() {
  const rows: string[] = [];
  for (const source of defaultSources) {
    const result = await testSource(source, 168);
    const newest = result.newest ? new Date(result.newest).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—";
    rows.push(`| ${source.name} | ${source.feedUrl ?? "—"} | ${result.ok ? "OK" : "FALHA"} | ${result.found} | ${result.recent} | ${newest} | ${result.message} |`);
    console.log(`${result.ok ? "OK   " : "FALHA"} ${source.name}: ${result.message}`);
    for (const sample of result.samples) console.log(`      ${sample.publishedAt ?? "sem data"}  ${sample.title}  ${sample.url}`);
  }
  const table = ["| Fonte | Endereço | Situação | Itens | Últimos 7 dias | Mais recente | Mensagem |", "|---|---|---|---|---|---|---|", ...rows].join("\n");
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Fontes de notícias\n\n${table}\n`);
}

main().catch((error: unknown) => {
  console.error("Falha ao verificar as fontes:", error instanceof Error ? error.message : "erro desconhecido");
  process.exitCode = 1;
});
