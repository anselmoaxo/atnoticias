import { loadEnvConfig } from "@next/env";
import { importNews } from "@/lib/news/importer";

loadEnvConfig(process.cwd());

// O GitHub Actions chama a cada hora; a frequência configurada no painel decide se a coleta roda. Use --force para ignorá-la.
const force = process.argv.includes("--force");

importNews({ trigger: "schedule", force }).then((result) => {
  console.log(JSON.stringify(result, null, 2));
  if (result.status === "failed") process.exitCode = 1;
}).catch((error: unknown) => {
  console.error("Falha na importação:", error instanceof Error ? error.name : "erro desconhecido");
  process.exitCode = 1;
});
