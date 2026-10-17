import { categories } from "@/lib/content";
import { getDb } from "@/lib/db";
import { cleanText } from "@/lib/news/importer";

export type AdminSource = {
  id: string; name: string; site_url: string; kind: "rss" | "sitemap" | "manual"; feed_url: string | null; path_prefix: string | null;
  source_type: "editorial" | "official"; language: "pt-BR" | "en"; default_category: string; enabled: boolean; use_images: boolean;
  max_items: number; notes: string | null; last_run_at: string | null; last_success_at: string | null;
  last_status: "ok" | "empty" | "error" | "blocked" | null; last_message: string | null; last_found: number; last_added: number;
  consecutive_failures: number; articles: number;
};

export type AdminRun = {
  id: string; started_at: string; finished_at: string | null; status: "running" | "completed" | "partial" | "failed";
  trigger: string; feeds_checked: number; articles_added: number; items_found: number; duplicates: number;
  skipped_old: number; skipped_irrelevant: number; message: string | null;
  source_results: Array<{ name: string; status: string; found: number; added: number; message: string }>;
};

export const frequencyOptions = [60, 120, 180, 360, 720, 1440] as const;

export async function listAdminSources(): Promise<AdminSource[]> {
  const sql = getDb();
  return await sql.query(
    `SELECT s.id, s.name, s.site_url, s.kind, s.feed_url, s.path_prefix, s.source_type, s.language, s.default_category, s.enabled,
      s.use_images, s.max_items, s.notes, s.last_run_at, s.last_success_at, s.last_status, s.last_message, s.last_found, s.last_added,
      s.consecutive_failures, (SELECT count(*)::int FROM news_articles a WHERE a.source_id = s.id) AS articles
     FROM news_sources s ORDER BY s.enabled DESC, s.source_type, s.name`,
  ) as AdminSource[];
}

export async function listRuns(limit = 30): Promise<AdminRun[]> {
  const sql = getDb();
  return await sql.query(
    `SELECT id, started_at, finished_at, status, trigger, feeds_checked, articles_added, items_found, duplicates, skipped_old,
      skipped_irrelevant, message, source_results FROM news_import_runs ORDER BY started_at DESC LIMIT $1`,
    [limit],
  ) as AdminRun[];
}

function httpsOrNull(value: unknown, label: string): { value: string | null; error?: string } {
  if (value === undefined || value === null || value === "") return { value: null };
  if (typeof value !== "string") return { value: null, error: `${label}: informe uma URL.` };
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return { value: null, error: `${label} precisa usar HTTPS.` };
    if (url.username || url.password) return { value: null, error: `${label} não pode conter usuário ou senha.` };
    return { value: url.toString() };
  } catch { return { value: null, error: `${label}: URL inválida.` }; }
}

export type SourceInput = {
  name: string; site_url: string; kind: "rss" | "sitemap" | "manual"; feed_url: string | null; path_prefix: string | null;
  source_type: "editorial" | "official"; language: "pt-BR" | "en"; default_category: string; enabled: boolean;
  use_images: boolean; max_items: number; notes: string | null;
};

/** Valida o formulário de fonte. Toda URL precisa ser HTTPS pública; nada de credenciais embutidas. */
export function parseSourceInput(body: unknown): { input?: SourceInput; error?: string } {
  if (!body || typeof body !== "object") return { error: "Envie dados válidos." };
  const data = body as Record<string, unknown>;
  const name = typeof data.name === "string" ? cleanText(data.name) : "";
  if (name.length < 2 || name.length > 80) return { error: "O nome precisa ter entre 2 e 80 caracteres." };
  const kind = data.kind;
  if (kind !== "rss" && kind !== "sitemap" && kind !== "manual") return { error: "Escolha o tipo de coleta." };
  const site = httpsOrNull(data.site_url, "O endereço do site");
  if (site.error || !site.value) return { error: site.error ?? "Informe o endereço do site (https://…)." };
  const feed = httpsOrNull(data.feed_url, kind === "sitemap" ? "O sitemap" : "O feed");
  if (feed.error) return { error: feed.error };
  if (kind !== "manual" && !feed.value) return { error: kind === "sitemap" ? "Informe a URL do sitemap." : "Informe a URL do feed RSS/Atom." };
  const prefix = httpsOrNull(data.path_prefix, "O prefixo das notícias");
  if (prefix.error) return { error: prefix.error };
  if (kind === "sitemap" && !prefix.value) return { error: "Informe o prefixo das URLs de notícia (ex.: https://site.com/news/)." };
  const sourceType = data.source_type === "official" ? "official" : data.source_type === "editorial" ? "editorial" : null;
  if (!sourceType) return { error: "Indique se a fonte publica anúncios oficiais ou reportagens." };
  const language = data.language === "en" ? "en" : data.language === "pt-BR" ? "pt-BR" : null;
  if (!language) return { error: "Escolha o idioma da fonte." };
  const category = typeof data.default_category === "string" ? data.default_category : "";
  if (!categories.some((item) => item.name === category)) return { error: "Escolha uma categoria padrão válida." };
  const maxItems = Number(data.max_items);
  if (!Number.isInteger(maxItems) || maxItems < 1 || maxItems > 60) return { error: "O limite por coleta precisa ficar entre 1 e 60." };
  const notes = typeof data.notes === "string" ? cleanText(data.notes).slice(0, 600) : "";
  return {
    input: {
      name, site_url: site.value, kind, feed_url: kind === "manual" ? null : feed.value, path_prefix: kind === "sitemap" ? prefix.value : null,
      source_type: sourceType, language, default_category: category, enabled: data.enabled !== false, use_images: data.use_images !== false,
      max_items: maxItems, notes: notes || null,
    },
  };
}

export function sourceIdFor(name: string) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "fonte";
}
