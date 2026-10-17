import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseArticleMeta, parseFeed, parseSitemap } from "@/lib/news/collect";
import { briefSummary, isOffTopic, isSameStory, relevanceScore, titleTokens } from "@/lib/news/editorial";
import { parseRobots, robotsAllows } from "@/lib/news/fetcher";
import { categoryFor, cleanText, normalizeSourceUrl, StoryIndex } from "@/lib/news/importer";
import { defaultSources } from "@/lib/news/sources";

describe("robots.txt", () => {
  const robots = `
User-agent: Googlebot
Disallow: /

User-agent: *
Disallow: /busca
Disallow: /*?preview=
Allow: /busca/feed$

User-agent: AnselmoTechNoticias
Disallow: /privado/
`;
  it("usa o grupo do próprio robô quando existe", () => {
    const rules = parseRobots(robots);
    assert.equal(robotsAllows(rules, "/feed/"), true);
    assert.equal(robotsAllows(rules, "/busca"), true);
    assert.equal(robotsAllows(rules, "/privado/x"), false);
  });

  it("cai no grupo * e respeita curingas, $ e a regra mais longa", () => {
    const rules = parseRobots(robots, "outrorobo");
    assert.equal(robotsAllows(rules, "/feed/"), true);
    assert.equal(robotsAllows(rules, "/busca?q=ia"), false);
    assert.equal(robotsAllows(rules, "/busca/feed"), true);
    assert.equal(robotsAllows(rules, "/noticia?preview=1"), false);
  });

  it("sem regras, libera", () => {
    assert.equal(robotsAllows(parseRobots(""), "/qualquer"), true);
  });
});

describe("resumo breve", () => {
  it("mantém textos curtos e remove o rodapé de WordPress", () => {
    assert.equal(briefSummary("Texto curto. The post Algo appeared first on Site."), "Texto curto.");
  });

  it("corta em frases inteiras até ~320 caracteres", () => {
    const long = `${"Primeira frase com bastante conteúdo sobre tecnologia. ".repeat(4)}${"Segunda parte que não cabe. ".repeat(20)}`;
    const summary = briefSummary(long);
    assert.ok(summary.length <= 320, String(summary.length));
    assert.ok(summary.endsWith("."));
  });

  it("sem pontuação, corta na palavra e indica com reticências", () => {
    const summary = briefSummary("palavra ".repeat(100));
    assert.ok(summary.length <= 320);
    assert.ok(summary.endsWith("…"));
  });
});

describe("mesmo anúncio com títulos diferentes", () => {
  const story = (title: string) => titleTokens(title);
  it("reconhece reescritas do mesmo anúncio", () => {
    assert.ok(isSameStory(story("OpenAI lança GPT-6 com raciocínio avançado"), story("GPT-6: OpenAI anuncia novo modelo com raciocínio avançado")));
    assert.ok(isSameStory(story("Anatel aprova leilão do 6G no Brasil"), story("Leilão do 6G é aprovado pela Anatel no Brasil")));
  });

  it("não confunde notícias diferentes do mesmo produto", () => {
    assert.ok(!isSameStory(story("Samsung Galaxy S26 recebe atualização de segurança"), story("Samsung Galaxy S26 ganha desconto na Black Friday")));
    assert.ok(!isSameStory(story("Google lança Gemini 3 para desenvolvedores"), story("Google demite equipe do Android Auto")));
  });

  it("o índice só compara notícias próximas no tempo", () => {
    const index = new StoryIndex();
    index.add("OpenAI lança GPT-6 com raciocínio avançado", new Date("2026-10-01T10:00:00Z"));
    assert.ok(index.has("GPT-6: OpenAI anuncia modelo com raciocínio avançado", new Date("2026-10-02T09:00:00Z")));
    assert.ok(!index.has("GPT-6: OpenAI anuncia modelo com raciocínio avançado", new Date("2026-10-09T09:00:00Z")));
  });
});

describe("relevância e tema", () => {
  it("descarta ofertas e entretenimento sem relação com tecnologia", () => {
    assert.ok(isOffTopic("Cupom de desconto: notebook Dell com desconto de 30%"));
    assert.ok(isOffTopic("Horóscopo do dia"));
    assert.ok(!isOffTopic("Anatel aprova regras para o 5G em áreas rurais"));
  });

  it("valoriza assuntos do Brasil e anúncios oficiais", () => {
    const br = relevanceScore({ title: "Anatel libera 6G no Brasil", summary: "", language: "pt-BR", sourceType: "editorial" });
    const foreign = relevanceScore({ title: "New AI chip announced", summary: "", language: "en", sourceType: "editorial" });
    const official = relevanceScore({ title: "Introducing Claude", summary: "", language: "en", sourceType: "official" });
    assert.ok(br > foreign);
    assert.ok(official > foreign);
  });

  it("classifica telecomunicações", () => {
    assert.equal(categoryFor("Operadoras ampliam cobertura 5G em São Paulo"), "Telecomunicações");
    assert.equal(categoryFor("Anthropic apresenta novo modelo", "Inteligência artificial"), "Inteligência artificial");
  });
});

describe("leitura de feeds", () => {
  it("extrai título, data, link, imagem de mídia e categorias do RSS", async () => {
    const xml = `<?xml version="1.0"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>X</title>
      <item><title>Nova falha &amp; correção</title><link>https://site.com.br/a?utm_source=rss</link><pubDate>Fri, 02 Oct 2026 12:00:00 -0300</pubDate>
      <description><![CDATA[<p>Resumo <b>curto</b>.</p>]]></description><category>Segurança</category><dc:creator>Ana</dc:creator>
      <media:content url="https://img.site.com.br/a.jpg" medium="image"/></item>
      <item><title>Sem data</title><link>https://site.com.br/b</link></item></channel></rss>`;
    const [first, second] = await parseFeed(xml);
    assert.equal(cleanText(first.title), "Nova falha & correção");
    assert.equal(first.publishedAt?.toISOString(), "2026-10-02T15:00:00.000Z");
    assert.equal(first.imageUrl, "https://img.site.com.br/a.jpg");
    assert.deepEqual(first.labels, ["Segurança"]);
    assert.equal(first.author, "Ana");
    assert.equal(normalizeSourceUrl(first.url), "https://site.com.br/a");
    assert.equal(second.publishedAt, null);
  });

  it("recusa conteúdo que não é feed", async () => {
    await assert.rejects(parseFeed("<html><body>Acesso negado</body></html>"));
  });

  it("lê sitemap e metadados públicos de uma página oficial", () => {
    const entries = parseSitemap(`<urlset><url><loc>https://www.anthropic.com/news/x</loc><lastmod>2026-10-02T10:00:00Z</lastmod></url><url><loc>https://www.anthropic.com/</loc></url></urlset>`);
    assert.equal(entries.length, 2);
    assert.equal(entries[0].lastmod?.toISOString(), "2026-10-02T10:00:00.000Z");
    const meta = parseArticleMeta(`<head><meta property="og:title" content="Claude Frontier Academy"/><meta name="description" content="Resumo oficial &amp; curto"/>
      <meta property="og:image" content="https://www.anthropic.com/api/og?name=a&amp;b=c"/><meta property="article:published_time" content="2026-10-02T13:00:00.000Z"/></head>`, "https://www.anthropic.com/news/x");
    assert.equal(meta.title, "Claude Frontier Academy");
    assert.equal(meta.description, "Resumo oficial & curto");
    assert.equal(meta.imageUrl, "https://www.anthropic.com/api/og?name=a&b=c");
    assert.equal(meta.publishedAt?.toISOString(), "2026-10-02T13:00:00.000Z");
  });
});

describe("migração das fontes", () => {
  const sql = readFileSync("db/migrations/006_news_sources.sql", "utf8");
  it("semeia exatamente as fontes de lib/news/sources.ts", () => {
    for (const source of defaultSources) {
      const feed = source.feedUrl ? `'${source.feedUrl}'` : "NULL";
      assert.ok(sql.includes(`('${source.id}', '${source.name}', '${source.siteUrl}', '${source.kind}', ${feed}`), source.id);
    }
  });

  it("não tem ponto e vírgula dentro de textos (scripts/migrate.ts divide os comandos por ;)", () => {
    for (const statement of sql.split(";")) assert.equal((statement.replace(/--.*$/gm, "").match(/'/g) ?? []).length % 2, 0, statement.slice(0, 80));
  });
});
