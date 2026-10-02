import { createHash, randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { categories } from "@/lib/content";
import { collectSource, mapLimit, type CandidateItem } from "@/lib/news/collect";
import { briefSummary, isOffTopic, isSameStory, relevanceScore, titleTokens } from "@/lib/news/editorial";
import { PoliteFetcher, SourceFetchError } from "@/lib/news/fetcher";
import { stripPromotions } from "@/lib/news/promotions";
import { sourceFromRow, type NewsSource, type SourceRow } from "@/lib/news/sources";

type Sql = ReturnType<typeof getDb>;

const categoryTerms: Array<[string, RegExp]> = [
  ["Inteligência artificial", /\b(ia|ai|llm|chatgpt|openai|gemini|copilot|claude)\b|intelig[eê]ncia artificial|artificial intelligence|machine learning|modelo(s)? de linguagem/i],
  ["Segurança digital", /\b(seguran[cç]a digital|cybersecurity|ransomware|ciberataque|malware|hacker|phishing)\b|privacidade|data breach|vazamento de dados|vulnerabilidade/i],
  ["Telecomunicações", /\b(5g|6g|anatel|telecom|telecomunica[cç][oõ]es|operadoras?|banda larga|fibra [oó]ptica|espectro|leil[aã]o de frequ[eê]ncias|internet via sat[eé]lite|starlink)\b/i],
  ["Games", /\b(game(s)?|jogo(s)?|playstation|xbox|nintendo|steam|gamer|gaming)\b/i],
  ["Celulares", /\b(celular|smartphone|iphone|android|ios|galaxy|motorola|xiaomi|pixel phone)\b/i],
  ["Startups", /\b(startup(s)?|fintech|unicorn|unic[oó]rnio)\b|venture capital|rodada de investimento|funding round/i],
  ["Aplicativos", /\b(app(s)?|aplicativo(s)?|whatsapp|instagram|tiktok|software)\b|mobile application/i],
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
    .replace(/&#(x[0-9a-f]{1,5}|\d{1,6});/gi, (_, code: string) => {
      const point = code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code);
      return point >= 32 && point <= 0x10ffff ? String.fromCodePoint(point) : " ";
    })
    .replace(/&amp;/gi, "&")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ").trim());
}

export function normalizeSourceUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
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

function slugFor(title: string, url: string): string {
  const base = title.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 110) || "noticia";
  const suffix = createHash("sha256").update(url).digest("hex").slice(0, 8);
  return `${base}-${suffix}`;
}

/** Títulos recentes já gravados, para reconhecer o mesmo anúncio publicado com outro título. */
export class StoryIndex {
  private entries: Array<{ tokens: Set<string>; time: number }> = [];
  static readonly windowMs = 72 * 60 * 60 * 1000;

  static async load(sql: Sql) {
    const index = new StoryIndex();
    const rows = await sql.query(
      "SELECT title, published_at FROM news_articles WHERE published_at > now() - interval '10 days' ORDER BY published_at DESC LIMIT 3000",
    ) as Array<{ title: string; published_at: string }>;
    for (const row of rows) index.add(row.title, new Date(row.published_at));
    return index;
  }

  add(title: string, publishedAt: Date) { this.entries.push({ tokens: titleTokens(title), time: publishedAt.getTime() }); }

  has(title: string, publishedAt: Date) {
    const tokens = titleTokens(title);
    const time = publishedAt.getTime();
    return this.entries.some((entry) => Math.abs(entry.time - time) <= StoryIndex.windowMs && isSameStory(tokens, entry.tokens));
  }
}

export type ArticleSource = Pick<NewsSource, "id" | "name" | "sourceType" | "language" | "defaultCategory" | "useImages">;
export type ArticleDraft = {
  title: string; summary: string; url: string; publishedAt: Date; labels?: string[];
  imageUrl?: string | null; author?: string | null; category?: string;
};

/** Grava uma notícia se ela for inédita. O banco garante a unicidade do link; o índice evita o mesmo anúncio repetido. */
export async function insertArticle(sql: Sql, source: ArticleSource, draft: ArticleDraft, stories: StoryIndex): Promise<"added" | "duplicate"> {
  if (stories.has(draft.title, draft.publishedAt)) return "duplicate";
  stories.add(draft.title, draft.publishedAt);
  const category = draft.category ?? categoryFor(`${draft.title} ${draft.summary}`, source.defaultCategory, draft.labels ?? []);
  const imageUrl = source.useImages ? draft.imageUrl ?? null : null;
  const rows = await sql.query(
    `INSERT INTO news_articles
      (id, slug, title, summary, category, author, image_url, image_credit, source_id, source_name, source_type, language,
       relevance, source_url, published_at, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'published')
     ON CONFLICT (source_url) DO NOTHING
     RETURNING id`,
    [randomUUID(), slugFor(draft.title, draft.url), draft.title, draft.summary, category,
      draft.author ? cleanText(draft.author).slice(0, 160) || null : null,
      imageUrl, imageUrl ? `Imagem: ${source.name}` : null, source.id, source.name, source.sourceType, source.language,
      relevanceScore({ title: draft.title, summary: draft.summary, language: source.language, sourceType: source.sourceType }),
      draft.url, draft.publishedAt.toISOString()],
  );
  return rows.length ? "added" : "duplicate";
}

export type SourceOutcome = {
  sourceId: string; name: string;
  status: "ok" | "empty" | "error" | "blocked" | "manual";
  found: number; added: number; duplicates: number; old: number; irrelevant: number; invalid: number;
  message: string;
};

export type CollectorSettings = { enabled: boolean; frequency_minutes: number; max_age_hours: number };

export type ImportResult = {
  runId: string | null; status: "completed" | "partial" | "failed" | "skipped";
  feedsChecked: number; articlesAdded: number; duplicates: number;
  errors: Array<{ source: string; code: string }>;
  sources: SourceOutcome[]; message: string;
};

type ImportOptions = { trigger: "schedule" | "manual" | "cron"; force?: boolean };

export async function readCollectorSettings(sql: Sql): Promise<CollectorSettings> {
  const rows = await sql.query("SELECT enabled, frequency_minutes, max_age_hours FROM news_collector_settings WHERE id = 1") as CollectorSettings[];
  return rows[0] ?? { enabled: true, frequency_minutes: 60, max_age_hours: 72 };
}

function failureMessage(error: unknown) {
  if (error instanceof SourceFetchError) return error.message;
  return "Falha inesperada ao ler a fonte.";
}

async function processSource(sql: Sql, source: NewsSource, fetcher: PoliteFetcher, stories: StoryIndex, since: Date): Promise<SourceOutcome> {
  const outcome: SourceOutcome = { sourceId: source.id, name: source.name, status: "ok", found: 0, added: 0, duplicates: 0, old: 0, irrelevant: 0, invalid: 0, message: "" };
  if (source.kind === "manual") {
    return { ...outcome, status: "manual", message: "Fonte sem coleta automática: cadastre as notícias manualmente no painel." };
  }
  const newestAllowed = Date.now() + 60 * 60 * 1000;
  try {
    const result = await collectSource(source, fetcher, {
      since,
      knownUrls: async (urls) => new Set((await sql.query("SELECT source_url FROM news_articles WHERE source_url = ANY($1)", [urls]) as Array<{ source_url: string }>).map((row) => row.source_url)),
    });
    if (result.notModified) {
      await sql.query("UPDATE news_sources SET last_run_at = now(), last_success_at = now(), last_status = 'empty', last_message = $2, last_found = 0, last_added = 0, consecutive_failures = 0 WHERE id = $1",
        [source.id, "O feed não mudou desde a última consulta."]);
      return { ...outcome, status: "empty", message: "O feed não mudou desde a última consulta." };
    }
    outcome.found = result.items.length;
    for (const item of result.items) {
      const verdict = await processItem(sql, source, item, stories, since.getTime(), newestAllowed);
      outcome[verdict] += 1;
    }
    outcome.status = outcome.added ? "ok" : "empty";
    outcome.message = outcome.found === 0 ? "A fonte respondeu, mas não trouxe notícias dentro do período configurado."
      : outcome.added ? `${outcome.added} notícia(s) nova(s).`
        : "Nenhuma notícia nova: tudo o que a fonte trouxe já estava salvo, era antigo ou fora do tema.";
    await sql.query(
      `UPDATE news_sources SET last_run_at = now(), last_success_at = now(), last_status = $2, last_message = $3, last_found = $4,
        last_added = $5, consecutive_failures = 0, etag = $6, last_modified = $7 WHERE id = $1`,
      [source.id, outcome.status, outcome.message, outcome.found, outcome.added, result.etag, result.lastModified],
    );
  } catch (error) {
    outcome.status = error instanceof SourceFetchError && (error.kind === "robots" || error.status === 401 || error.status === 403) ? "blocked" : "error";
    outcome.message = failureMessage(error);
    await sql.query(
      "UPDATE news_sources SET last_run_at = now(), last_status = $2, last_message = $3, last_found = 0, last_added = 0, consecutive_failures = consecutive_failures + 1 WHERE id = $1",
      [source.id, outcome.status, outcome.message],
    ).catch(() => undefined);
  }
  return outcome;
}

async function processItem(sql: Sql, source: NewsSource, item: CandidateItem, stories: StoryIndex, oldestAllowed: number, newestAllowed: number):
  Promise<"added" | "duplicates" | "old" | "irrelevant" | "invalid"> {
  const title = cleanText(item.title).slice(0, 240);
  const summary = briefSummary(cleanText(item.description));
  const url = normalizeSourceUrl(item.url);
  if (title.length < 5 || !summary || !url || !item.publishedAt) return "invalid";
  // A data original é obrigatória: sem ela, ou fora da janela, a notícia não entra como recente.
  const time = item.publishedAt.getTime();
  if (time < oldestAllowed || time > newestAllowed) return "old";
  if (isOffTopic(title)) return "irrelevant";
  const result = await insertArticle(sql, source, {
    title, summary, url, publishedAt: item.publishedAt, labels: item.labels, imageUrl: item.imageUrl, author: item.author,
  }, stories);
  return result === "added" ? "added" : "duplicates";
}

function runMessage(outcomes: SourceOutcome[], added: number) {
  const failed = outcomes.filter((outcome) => outcome.status === "error" || outcome.status === "blocked");
  const automatic = outcomes.filter((outcome) => outcome.status !== "manual");
  if (!automatic.length) return "Nenhuma fonte ativa com coleta automática.";
  let message = added ? `${added} notícia(s) nova(s) cadastrada(s).`
    : failed.length === automatic.length ? "Nenhuma fonte respondeu; nenhuma notícia foi cadastrada."
      : failed.length ? "Nenhuma notícia nova nas fontes que responderam."
        : "Coleta concluída sem notícias novas: as fontes não publicaram nada inédito no período.";
  if (failed.length) message += ` ${failed.length} fonte(s) com falha: ${failed.map((outcome) => outcome.name).join(", ")}.`;
  return message;
}

export async function importNews(options: ImportOptions = { trigger: "manual" }): Promise<ImportResult> {
  const sql = getDb();
  const settings = await readCollectorSettings(sql);
  const skipped = (message: string): ImportResult => ({ runId: null, status: "skipped", feedsChecked: 0, articlesAdded: 0, duplicates: 0, errors: [], sources: [], message });

  if (options.trigger !== "manual" && !options.force) {
    if (!settings.enabled) return skipped("A coleta automática está pausada no painel.");
    // O agendador roda a cada hora; aqui se respeita a frequência escolhida (margem de 5 min para atrasos do agendador).
    const recent = await sql.query(
      "SELECT 1 FROM news_import_runs WHERE trigger <> 'manual' AND status <> 'failed' AND started_at > now() - make_interval(mins => $1) LIMIT 1",
      [Math.max(settings.frequency_minutes - 5, 1)],
    );
    if (recent.length) return skipped(`Ainda não é hora: a coleta está configurada para cada ${settings.frequency_minutes / 60} hora(s).`);
  }

  await sql.query("UPDATE news_import_runs SET status = 'failed', finished_at = now(), message = 'Execução interrompida antes de terminar.' WHERE status = 'running' AND started_at < now() - interval '15 minutes'");
  const runId = randomUUID();
  try {
    await sql.query("INSERT INTO news_import_runs (id, status, trigger) VALUES ($1, 'running', $2)", [runId, options.trigger]);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return skipped("Já existe uma coleta em andamento. Aguarde ela terminar.");
    throw error;
  }

  try {
    const rows = await sql.query(
      `SELECT id, name, site_url, kind, feed_url, path_prefix, source_type, language, default_category, enabled, use_images,
        max_items, notes, etag, last_modified FROM news_sources WHERE enabled ORDER BY source_type DESC, name`,
    ) as SourceRow[];
    const sources = rows.map(sourceFromRow);
    const since = new Date(Date.now() - settings.max_age_hours * 60 * 60 * 1000);
    const stories = await StoryIndex.load(sql);
    const fetcher = new PoliteFetcher();
    const deadline = Date.now() + 48_000;
    const outcomes = await mapLimit(sources, 5, async (source) => {
      if (Date.now() > deadline) {
        return { sourceId: source.id, name: source.name, status: "error", found: 0, added: 0, duplicates: 0, old: 0, irrelevant: 0, invalid: 0,
          message: "Tempo limite da coleta atingido; a fonte será consultada na próxima execução." } satisfies SourceOutcome;
      }
      return processSource(sql, source, fetcher, stories, since);
    });

    const automatic = outcomes.filter((outcome) => outcome.status !== "manual");
    const failed = automatic.filter((outcome) => outcome.status === "error" || outcome.status === "blocked");
    const sum = (key: "found" | "added" | "duplicates" | "old" | "irrelevant") => outcomes.reduce((total, outcome) => total + outcome[key], 0);
    const status = failed.length === 0 ? "completed" : failed.length === automatic.length ? "failed" : "partial";
    const errors = failed.map((outcome) => ({ source: outcome.name, code: outcome.status === "blocked" ? "Blocked" : "FeedError" }));
    const message = runMessage(outcomes, sum("added"));
    await sql.query(
      `UPDATE news_import_runs SET finished_at = now(), status = $2, feeds_checked = $3, articles_added = $4, errors = $5::jsonb,
        items_found = $6, duplicates = $7, skipped_old = $8, skipped_irrelevant = $9, source_results = $10::jsonb, message = $11 WHERE id = $1`,
      [runId, status, automatic.length, sum("added"), JSON.stringify(errors), sum("found"), sum("duplicates"), sum("old"), sum("irrelevant"), JSON.stringify(outcomes), message],
    );
    return { runId, status, feedsChecked: automatic.length, articlesAdded: sum("added"), duplicates: sum("duplicates"), errors, sources: outcomes, message };
  } catch (error) {
    await sql.query("UPDATE news_import_runs SET finished_at = now(), status = 'failed', message = $2 WHERE id = $1",
      [runId, "A coleta parou por um erro interno. Consulte os logs."]).catch(() => undefined);
    throw error;
  }
}

export type SourceTest = { ok: boolean; message: string; found: number; recent: number; newest: string | null; samples: Array<{ title: string; publishedAt: string | null; url: string }> };

/** Consulta a fonte sem gravar nada: mostra se ela responde e o que a próxima coleta encontraria. */
export async function testSource(source: NewsSource, maxAgeHours: number): Promise<SourceTest> {
  if (source.kind === "manual") return { ok: true, message: "Fonte de cadastro manual: não há coleta automática para testar.", found: 0, recent: 0, newest: null, samples: [] };
  const since = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  try {
    const result = await collectSource({ ...source, etag: null, lastModified: null }, new PoliteFetcher(), { since });
    const items = result.notModified ? [] : result.items;
    const dated = items.filter((item) => item.publishedAt).sort((a, b) => b.publishedAt!.getTime() - a.publishedAt!.getTime());
    const recent = dated.filter((item) => item.publishedAt! >= since).length;
    const message = !items.length ? "A fonte respondeu, mas não trouxe nenhuma notícia."
      : !dated.length ? "A fonte respondeu, mas as notícias não informam a data de publicação; elas seriam ignoradas."
        : recent ? `Fonte funcionando: ${items.length} item(ns) lido(s), ${recent} dentro do período configurado.`
          : `Fonte funcionando, mas nenhuma das ${items.length} notícias está dentro do período configurado (${maxAgeHours} h).`;
    return {
      ok: recent > 0, message, found: items.length, recent, newest: dated[0]?.publishedAt?.toISOString() ?? null,
      samples: dated.slice(0, 3).map((item) => ({ title: cleanText(item.title).slice(0, 240), publishedAt: item.publishedAt?.toISOString() ?? null, url: normalizeSourceUrl(item.url) ?? "" })),
    };
  } catch (error) {
    return { ok: false, message: failureMessage(error), found: 0, recent: 0, newest: null, samples: [] };
  }
}
