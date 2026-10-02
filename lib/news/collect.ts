import Parser from "rss-parser";
import { PoliteFetcher, SourceFetchError } from "@/lib/news/fetcher";
import type { NewsSource } from "@/lib/news/sources";

export type CandidateItem = {
  title: string;
  description: string;
  url: string;
  publishedAt: Date | null;
  labels: string[];
  imageUrl: string | null;
  author: string | null;
};

export type CollectResult =
  | { notModified: true }
  | { notModified: false; items: CandidateItem[]; etag: string | null; lastModified: string | null };

type FeedItem = Record<string, unknown>;
const parser: Parser<Record<string, unknown>, FeedItem> = new Parser({
  customFields: { item: [["media:content", "mediaContent"], ["media:thumbnail", "mediaThumbnail"], ["dc:creator", "dcCreator"]] },
});

export function httpsUrl(candidate: unknown): string | null {
  if (typeof candidate !== "string" || !candidate) return null;
  try { const url = new URL(candidate.trim()); return url.protocol === "https:" ? url.toString() : null; }
  catch { return null; }
}

function mediaUrl(value: unknown): string | null {
  const node = Array.isArray(value) ? value[0] : value;
  if (!node || typeof node !== "object") return null;
  const attributes = (node as { $?: { url?: string; medium?: string; type?: string } }).$;
  if (!attributes?.url) return null;
  if (attributes.medium && attributes.medium !== "image") return null;
  if (attributes.type && !attributes.type.startsWith("image/")) return null;
  return httpsUrl(attributes.url);
}

// Só imagens que a própria fonte distribui no feed como mídia da notícia (enclosure ou media:*).
function itemImage(item: FeedItem): string | null {
  const enclosure = item.enclosure as { url?: string; type?: string } | undefined;
  if (enclosure?.url && (!enclosure.type || enclosure.type.startsWith("image/"))) {
    const url = httpsUrl(enclosure.url);
    if (url) return url;
  }
  return mediaUrl(item.mediaContent) ?? mediaUrl(item.mediaThumbnail);
}

function itemLabels(item: FeedItem): string[] {
  const raw = item.categories ?? item.category;
  const values = Array.isArray(raw) ? raw : [raw];
  return values.map((value) => typeof value === "string" ? value : (value as { _?: string } | null)?._)
    .filter((value): value is string => typeof value === "string").slice(0, 12);
}

const text = (value: unknown) => typeof value === "string" ? value : "";

export async function parseFeed(xml: string): Promise<CandidateItem[]> {
  let feed;
  try { feed = await parser.parseString(xml); }
  catch { throw new SourceFetchError("http", null, "O conteúdo recebido não é um feed RSS/Atom válido."); }
  return (feed.items ?? []).map((item) => {
    const date = new Date(text(item.isoDate) || text(item.pubDate));
    return {
      title: text(item.title),
      description: text(item.contentSnippet) || text(item.summary) || text(item.description) || text(item.content),
      url: text(item.link),
      publishedAt: Number.isNaN(date.getTime()) ? null : date,
      labels: itemLabels(item),
      imageUrl: itemImage(item),
      author: text(item.creator) || text(item.dcCreator) || text(item.author) || null,
    };
  });
}

/** Entradas <url> do sitemap com <lastmod>. Não segue índices de sitemap. */
export function parseSitemap(xml: string): Array<{ loc: string; lastmod: Date | null }> {
  const entries: Array<{ loc: string; lastmod: Date | null }> = [];
  for (const block of xml.match(/<url>[\s\S]*?<\/url>/g) ?? []) {
    const loc = /<loc>\s*([^<\s]+)\s*<\/loc>/.exec(block)?.[1];
    if (!loc) continue;
    const lastmodRaw = /<lastmod>\s*([^<\s]+)\s*<\/lastmod>/.exec(block)?.[1];
    const lastmod = lastmodRaw ? new Date(lastmodRaw) : null;
    entries.push({ loc: loc.replace(/&amp;/g, "&"), lastmod: lastmod && !Number.isNaN(lastmod.getTime()) ? lastmod : null });
  }
  return entries;
}

function metaContent(html: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\:]/g, "\\$&");
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (!new RegExp(`(?:property|name|itemprop)\\s*=\\s*["']${escaped}["']`, "i").test(tag)) continue;
    const content = /content\s*=\s*"([^"]*)"/i.exec(tag)?.[1] ?? /content\s*=\s*'([^']*)'/i.exec(tag)?.[1];
    if (content) return content.replace(/&amp;/g, "&");
  }
  return "";
}

/** Metadados públicos de compartilhamento (Open Graph / JSON-LD) de uma página de notícia. Não lê o corpo. */
export function parseArticleMeta(html: string, url: string): CandidateItem {
  const published = metaContent(html, "article:published_time") || /"datePublished"\s*:\s*"([^"]+)"/.exec(html)?.[1] || "";
  const date = new Date(published);
  return {
    title: metaContent(html, "og:title") || /<title>([^<]*)<\/title>/i.exec(html)?.[1] || "",
    description: metaContent(html, "og:description") || metaContent(html, "description"),
    url,
    publishedAt: published && !Number.isNaN(date.getTime()) ? date : null,
    labels: [],
    imageUrl: httpsUrl(metaContent(html, "og:image")),
    author: null,
  };
}

export async function mapLimit<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const index = next++; results[index] = await task(items[index]); }
  }));
  return results;
}

export async function collectSource(source: NewsSource, fetcher: PoliteFetcher, options: { since: Date; knownUrls?: (urls: string[]) => Promise<Set<string>> }): Promise<CollectResult> {
  if (source.kind === "manual" || !source.feedUrl) return { notModified: false, items: [], etag: null, lastModified: null };

  if (source.kind === "rss") {
    const response = await fetcher.get(source.feedUrl, { etag: source.etag, lastModified: source.lastModified });
    if (response.status === 304) return { notModified: true };
    const items = (await parseFeed(response.body)).slice(0, source.maxItems);
    return { notModified: false, items, etag: response.etag, lastModified: response.lastModified };
  }

  // Sitemap: candidatos alterados dentro da janela; páginas já importadas não são baixadas de novo.
  const response = await fetcher.get(source.feedUrl, { accept: "application/xml, text/xml;q=0.9" });
  if (response.status === 304) return { notModified: true };
  const prefix = source.pathPrefix ?? "";
  let candidates = parseSitemap(response.body)
    .filter((entry) => entry.loc.startsWith(prefix) && entry.loc.length > prefix.length && entry.lastmod && entry.lastmod >= options.since)
    .sort((a, b) => b.lastmod!.getTime() - a.lastmod!.getTime());
  if (options.knownUrls && candidates.length) {
    const known = await options.knownUrls(candidates.map((entry) => entry.loc));
    candidates = candidates.filter((entry) => !known.has(entry.loc));
  }
  candidates = candidates.slice(0, Math.min(source.maxItems, 12));
  const pages = await mapLimit(candidates, 3, async (entry) => {
    try {
      const page = await fetcher.get(entry.loc, { accept: "text/html" });
      return page.status === 200 ? parseArticleMeta(page.body, entry.loc) : null;
    } catch { return null; }
  });
  return { notModified: false, items: pages.filter((item): item is CandidateItem => item !== null), etag: null, lastModified: null };
}
