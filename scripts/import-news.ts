import { loadEnvConfig } from "@next/env";
import { importNews } from "@/lib/news/importer";

loadEnvConfig(process.cwd());

importNews().then((result) => {
  console.log(JSON.stringify(result, null, 2));
}).catch((error: unknown) => {
  console.error("Falha na importação:", error instanceof Error ? error.name : "erro desconhecido");
  process.exitCode = 1;
});
