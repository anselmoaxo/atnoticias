export type SourceKind = "rss" | "sitemap" | "manual";
export type SourceType = "editorial" | "official";

export type NewsSource = {
  id: string;
  name: string;
  siteUrl: string;
  kind: SourceKind;
  feedUrl: string | null;
  /** Só para kind "sitemap": prefixo das URLs de notícia dentro do sitemap. */
  pathPrefix: string | null;
  sourceType: SourceType;
  language: "pt-BR" | "en";
  defaultCategory: string;
  enabled: boolean;
  useImages: boolean;
  maxItems: number;
  notes: string | null;
  etag?: string | null;
  lastModified?: string | null;
};

const base = { defaultCategory: "Tecnologia", enabled: true, useImages: true, maxItems: 30, pathPrefix: null, notes: null } as const;

// Lista inicial, igual à semeada por db/migrations/006_news_sources.sql. Depois da migração, a fonte de verdade
// é a tabela news_sources (editada no painel); esta lista serve ao `npm run news:check`, que roda sem banco.
export const defaultSources: NewsSource[] = [
  { ...base, id: "tecnoblog", name: "Tecnoblog", siteUrl: "https://tecnoblog.net/", kind: "rss", feedUrl: "https://tecnoblog.net/feed/", sourceType: "editorial", language: "pt-BR" },
  { ...base, id: "canaltech", name: "Canaltech", siteUrl: "https://canaltech.com.br/", kind: "rss", feedUrl: "https://canaltech.com.br/rss/google-assistente/", sourceType: "editorial", language: "pt-BR" },
  { ...base, id: "tecmundo", name: "TecMundo", siteUrl: "https://www.tecmundo.com.br/", kind: "rss", feedUrl: "https://rss.tecmundo.com.br/feed", sourceType: "editorial", language: "pt-BR" },
  { ...base, id: "olhar-digital", name: "Olhar Digital", siteUrl: "https://olhardigital.com.br/", kind: "rss", feedUrl: "https://olhardigital.com.br/feed/", sourceType: "editorial", language: "pt-BR" },
  { ...base, id: "techtudo", name: "TechTudo", siteUrl: "https://www.techtudo.com.br/", kind: "rss", feedUrl: "https://pox.globo.com/rss/techtudo/", sourceType: "editorial", language: "pt-BR" },
  { ...base, id: "adrenaline", name: "Adrenaline", siteUrl: "https://www.adrenaline.com.br/noticias/", kind: "manual", feedUrl: null, sourceType: "editorial", language: "pt-BR" },
  { ...base, id: "convergencia-digital", name: "Convergência Digital", siteUrl: "https://convergenciadigital.com.br/", kind: "rss", feedUrl: "https://convergenciadigital.com.br/feed/", sourceType: "editorial", language: "pt-BR" },
  { ...base, id: "openai", name: "OpenAI", siteUrl: "https://openai.com/pt-BR/news/", kind: "rss", feedUrl: "https://openai.com/news/rss.xml", sourceType: "official", language: "en", defaultCategory: "Inteligência artificial" },
  { ...base, id: "anthropic", name: "Anthropic", siteUrl: "https://www.anthropic.com/news", kind: "sitemap", feedUrl: "https://www.anthropic.com/sitemap.xml", pathPrefix: "https://www.anthropic.com/news/", sourceType: "official", language: "en", defaultCategory: "Inteligência artificial" },
  { ...base, id: "google-gemini", name: "Google Gemini", siteUrl: "https://blog.google/products-and-platforms/products/gemini/", kind: "rss", feedUrl: "https://blog.google/products/gemini/rss/", sourceType: "official", language: "en", defaultCategory: "Inteligência artificial" },
];

export type SourceRow = {
  id: string; name: string; site_url: string; kind: SourceKind; feed_url: string | null; path_prefix: string | null;
  source_type: SourceType; language: "pt-BR" | "en"; default_category: string; enabled: boolean; use_images: boolean;
  max_items: number; notes: string | null; etag: string | null; last_modified: string | null;
};

export function sourceFromRow(row: SourceRow): NewsSource {
  return {
    id: row.id, name: row.name, siteUrl: row.site_url, kind: row.kind, feedUrl: row.feed_url, pathPrefix: row.path_prefix,
    sourceType: row.source_type, language: row.language, defaultCategory: row.default_category, enabled: row.enabled,
    useImages: row.use_images, maxItems: row.max_items, notes: row.notes, etag: row.etag, lastModified: row.last_modified,
  };
}
