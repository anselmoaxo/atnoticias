import { createHash, randomUUID } from "node:crypto";
import Parser from "rss-parser";
import { getDb } from "@/lib/db";
import { categories } from "@/lib/content";
import { stripPromotions } from "@/lib/news/promotions";
import { newsSources } from "@/lib/news/sources";

const parser = new Parser({ timeout: 12_000, headers: { "User-Agent": "AnselmoTechNoticias/1.0 (+RSS reader)" } });
const categoryTerms: Array<[string, RegExp]> = [
  ["Inteligência artificial", /\b(ia|ai|llm|chatgpt|openai|gemini|copilot|claude)\b|intelig[eê]ncia artificial|artificial intelligence|machine learning|modelo(s)? de linguagem/i],
  ["Segurança digital", /\b(seguran[cç]a digital|cybersecurity|ransomware|ciberataque|malware|hacker|phishing)\b|privacidade|data breach|vazamento de dados|vulnerabilidade/i],
  ["Games", /\b(game(s)?|jogo(s)?|playstation|xbox|nintendo|steam|gamer|gaming)\b/i],
  ["Celulares", /\b(celular|smartphone|iphone|android|ios|galaxy|motorola|xiaomi|pixel phone)\b/i],
  ["Startups", /\b(startup(s)?|fintech|unicorn|unic[oó]rnio)\b|venture capital|rodada de investimento|funding round/i],
  ["Aplicativos", /\b(app(s)?|aplicativo(s)?|whatsapp|instagram|tiktok)\b|mobile application/i],
  ["Ciência e inovação", /\b(ci[eê]ncia|science|research|inova[cç][aã]o|innovation|rob[oô]|robot|espa[cç]o|space|quantum|descoberta)\b/i],
  ["Computadores", /\b(computador(es)?|notebook(s)?|laptop(s)?|pc|processador(es)?|chip(s)?|windows|mac(os)?|linux|nvidia|amd|gpu|cpu|hardware)\b/i],
];

// Decodifica as entidades antes de remover as tags (assim "&lt;script&gt;" também é removido) e descarta
// qualquer "<" ou ">" que sobrar: título e resumo são texto puro e nunca podem formar HTML adiante.
export function cleanText(value: string | undefined): string {
  return stripPromotions((value ?? "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ").trim());
}

function normalizeSourceUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_cid|mc_eid)/i.test(key)) url.searchParams.delete(key);
    }
    url.hash = "";
    return url.toString();
  } catch { return null; }
}

export function categoryFor(text: string, fallback = "Tecnologia", feedLabels: string[] = []): string {
  const labels = feedLabels.join(" ");
  for (const [name, pattern] of categoryTerms) if (pattern.test(labels)) return name;
  for (const [name, pattern] of categoryTerms) if (pattern.test(text)) return name;
  return categories.some((category) => category.name === fallback) ? fallback : "Tecnologia";
}

function itemCategories(item: Record<string, unknown>): string[] {
  const raw = item.categories ?? item.category;
  if (Array.isArray(raw)) return raw.filter((value): value is string => typeof value === "string").slice(0, 12);
  return typeof raw === "string" ? [raw] : [];
}

function slugFor(title: string, url: string): string {
  const base = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 110) || "noticia";
  const suffix = createHash("sha256").update(url).digest("hex").slice(0, 8);
  return `${base}-${suffix}`;
}

function itemImage(item: Record<string, unknown>): string | null {
  const enclosure = item.enclosure as { url?: string; type?: string } | undefined;
  const media = item["media:content"] as { $?: { url?: string } } | undefined;
  const candidate = enclosure?.type?.startsWith("image/") ? enclosure.url : media?.$?.url;
  if (!candidate) return null;
  try { const url = new URL(candidate); return url.protocol === "https:" ? url.toString() : null; }
  catch { return null; }
}

export async function importNews() {
  const sql = getDb();
  const runId = randomUUID();
  await sql.query("INSERT INTO news_import_runs (id, status) VALUES ($1, 'running')", [runId]);
  let added = 0;
  let checked = 0;
  const errors: Array<{ source: string; code: string }> = [];
  const newestAllowed = Date.now() + 60 * 60 * 1000;
  const oldestAllowed = Date.now() - 7 * 24 * 60 * 60 * 1000;

  for (const source of newsSources) {
    checked += 1;
    try {
      const feed = await parser.parseURL(source.feedUrl);
      const items = (feed.items ?? []).slice(0, 40);
      for (const rawItem of items) {
        const item = rawItem as unknown as Record<string, unknown>;
        const title = cleanText(typeof item.title === "string" ? item.title : "").slice(0, 240);
        const description = cleanText(
          typeof item.contentSnippet === "string" ? item.contentSnippet :
            typeof item.description === "string" ? item.description :
              typeof item.content === "string" ? item.content : "",
        ).slice(0, 900);
        const sourceUrl = normalizeSourceUrl(typeof item.link === "string" ? item.link : "");
        const publishedAt = new Date(String(item.isoDate ?? item.pubDate ?? ""));
        if (title.length < 5 || !description || !sourceUrl || Number.isNaN(publishedAt.getTime())) continue;
        if (publishedAt.getTime() < oldestAllowed || publishedAt.getTime() > newestAllowed) continue;

        const category = categoryFor(`${title} ${description}`, source.category, itemCategories(item));
        const imageUrl = itemImage(item);
        const result = await sql.query(
          `INSERT INTO news_articles
            (id, slug, title, summary, category, author, image_url, source_name, source_url, published_at, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'published')
           ON CONFLICT (source_url) DO NOTHING
           RETURNING id`,
          [randomUUID(), slugFor(title, sourceUrl), title, description, category,
            typeof item.creator === "string" ? cleanText(item.creator).slice(0, 160) : null,
            imageUrl, source.name, sourceUrl, publishedAt.toISOString()],
        );
        added += result.length;
      }
    } catch (error) {
      errors.push({ source: source.name, code: error instanceof Error ? error.name : "FeedError" });
    }
  }

  const status = errors.length === 0 ? "completed" : errors.length === checked ? "failed" : "partial";
  await sql.query(
    "UPDATE news_import_runs SET finished_at = now(), status = $2, feeds_checked = $3, articles_added = $4, errors = $5::jsonb WHERE id = $1",
    [runId, status, checked, added, JSON.stringify(errors)],
  );
  return { runId, status, feedsChecked: checked, articlesAdded: added, errors };
}
