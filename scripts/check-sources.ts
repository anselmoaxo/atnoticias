import { appendFileSync } from "node:fs";
import { USER_AGENT } from "@/lib/news/fetcher";
import { testSource } from "@/lib/news/importer";
import { defaultSources } from "@/lib/news/sources";

// Verifica as fontes iniciais sem tocar no banco: responde? o robots.txt permite? traz notícias recentes com data?
// Diagnóstico: mostra a resposta do robots.txt e as regras que citam o caminho do feed.
async function explainRobots(feedUrl: string) {
  const url = new URL(feedUrl);
  try {
    const response = await fetch(`${url.origin}/robots.txt`, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(10_000) });
    const text = await response.text();
    const segment = url.pathname.split("/").filter(Boolean)[0] ?? "";
    const lines = text.split(/\r?\n/).filter((line) => /^\s*(user-agent|disallow|allow)\s*:/i.test(line) && (/user-agent/i.test(line) || line.includes(segment) || /:\s*\/\s*$/.test(line)));
    console.log(`      robots.txt: HTTP ${response.status}`);
    for (const line of lines.slice(0, 40)) console.log(`        ${line.trim()}`);
  } catch (error) {
    console.log(`      robots.txt: ${error instanceof Error ? `${error.name} ${(error as { cause?: { code?: string } }).cause?.code ?? ""}` : "erro"}`);
  }
}

async function main() {
  const rows: string[] = [];
  for (const source of defaultSources) {
    const result = await testSource(source, 168);
    const newest = result.newest ? new Date(result.newest).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—";
    rows.push(`| ${source.name} | ${source.feedUrl ?? "—"} | ${result.ok ? "OK" : "FALHA"} | ${result.found} | ${result.recent} | ${newest} | ${result.message} |`);
    console.log(`${result.ok ? "OK   " : "FALHA"} ${source.name}: ${result.message}`);
    for (const sample of result.samples) console.log(`      ${sample.publishedAt ?? "sem data"}  ${sample.title}  ${sample.url}`);
    if (!result.ok && source.feedUrl) await explainRobots(source.feedUrl);
  }
  const table = ["| Fonte | Endereço | Situação | Itens | Últimos 7 dias | Mais recente | Mensagem |", "|---|---|---|---|---|---|---|", ...rows].join("\n");
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Fontes de notícias\n\n${table}\n`);
}

main().catch((error: unknown) => {
  console.error("Falha ao verificar as fontes:", error instanceof Error ? error.message : "erro desconhecido");
  process.exitCode = 1;
});
