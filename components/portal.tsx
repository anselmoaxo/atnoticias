"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { categories, type NewsArticle } from "@/lib/content";
import { NewsletterInvite, openNewsletter } from "@/components/newsletter-invite";

const timeZone = "America/Sao_Paulo";

function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone });
}

// Destaque: entre as notícias das 6 horas mais recentes, a de maior relevância (assuntos do Brasil e anúncios oficiais pesam mais).
function pickLead(articles: NewsArticle[]) {
  const newest = articles[0];
  if (!newest) return undefined;
  const windowStart = new Date(newest.published_at).getTime() - 6 * 60 * 60 * 1000;
  return articles.filter((article) => new Date(article.published_at).getTime() >= windowStart)
    .reduce((best, article) => (article.relevance ?? 0) > (best.relevance ?? 0) ? article : best, newest);
}

function SourceMeta({ article, withReading = false }: { article: NewsArticle; withReading?: boolean }) {
  return <div className="p-meta">
    <b>{article.source_name}</b>
    {article.source_type === "official" && <span className="p-badge">Anúncio oficial</span>}
    {article.language === "en" && <span className="p-badge p-badge-muted" lang="pt-BR">Em inglês</span>}
    <span>{article.category}</span>
    {withReading && <span>{readingMinutes(article)} min de leitura</span>}
  </div>;
}

function readingMinutes(article: NewsArticle) {
  return Math.max(1, Math.ceil(`${article.title} ${article.summary}`.trim().split(/\s+/).length / 220));
}

export function Portal({ initialCategory, initialArticles = [], popularArticles = [], dataError = false }: {
  initialCategory?: string;
  initialArticles?: NewsArticle[];
  popularArticles?: NewsArticle[];
  dataError?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory ?? "");
  const filteredArticles = initialArticles.filter((article) => {
    const matchesCategory = !category || categories.find((item) => item.slug === category)?.name === article.category;
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return matchesCategory && (!term || `${article.title} ${article.summary} ${article.source_name}`.toLocaleLowerCase("pt-BR").includes(term));
  });

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if (!document.querySelector('[aria-modal="true"]') && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("site-search")?.focus();
      }
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const now = new Date();
  const todayKey = dayKey(now.toISOString());
  const yesterdayKey = dayKey(new Date(now.getTime() - 86400000).toISOString());
  const lead = !query ? pickLead(filteredArticles) : undefined;
  const rest = (lead ? filteredArticles.filter((article) => article.id !== lead.id) : filteredArticles).slice(0, 40);
  const categoryName = categories.find((item) => item.slug === category)?.name;

  function dayHeading(iso: string) {
    const key = dayKey(iso);
    if (key === todayKey) return "Hoje";
    if (key === yesterdayKey) return "Ontem";
    return new Date(iso).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone });
  }

  // A data acompanha o destaque para que uma notícia antiga nunca pareça de hoje.
  function leadFlag(iso: string) {
    const day = dayHeading(iso);
    return day === "Hoje" ? "Destaque de hoje" : day === "Ontem" ? "Destaque · publicado ontem" : `Destaque · publicado em ${day}`;
  }

  function renderItem(article: NewsArticle, isLead = false) {
    const Heading = isLead ? "h2" : "h3";
    return (
      <article className={isLead ? "p-item p-lead" : "p-item"} key={article.id}>
        <time className="p-time" dateTime={article.published_at}>{timeLabel(article.published_at)}</time>
        <div className="p-row">
          <div>
            {isLead && <span className="p-flag" suppressHydrationWarning>{leadFlag(article.published_at)}</span>}
            {!isLead && <SourceMeta article={article} />}
            <Heading lang={article.language === "en" ? "en" : undefined}><Link href={`/noticia/${article.slug}`}>{article.title}</Link></Heading>
            <p className="p-sum" lang={article.language === "en" ? "en" : undefined}>{article.summary}</p>
            {isLead && <SourceMeta article={article} withReading />}
          </div>
          {!isLead && article.image_url && (
            <Link href={`/noticia/${article.slug}`} className="p-thumb" tabIndex={-1} aria-hidden="true">
              <Image src={article.image_url} alt="" width={256} height={171} sizes="128px" unoptimized />
            </Link>
          )}
        </div>
      </article>
    );
  }

  const feedItems: React.ReactNode[] = [];
  let previousDay = lead ? dayKey(lead.published_at) : "";
  rest.forEach((article) => {
    const key = dayKey(article.published_at);
    if (key !== previousDay) {
      feedItems.push(<h3 className="p-day" key={`day-${key}`} suppressHydrationWarning>{dayHeading(article.published_at)}</h3>);
      previousDay = key;
    }
    feedItems.push(renderItem(article));
  });

  return (
    <div className="p-site">
      <div className="p-wrap">
        <header className="p-header">
          <Link href="/" className="p-brand" aria-label="Anselmo Tech Notícias, início"><span className="p-dot" aria-hidden="true" />Anselmo Tech <b>Notícias</b></Link>
          <button className="p-linkbtn" onClick={openNewsletter}>Receber a newsletter</button>
        </header>

        <div className="p-layout">
          <aside className="p-tools">
            <form className="p-search" role="search" onSubmit={(event) => event.preventDefault()}>
              <label className="sr-only" htmlFor="site-search">Buscar notícias</label>
              <input id="site-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar notícias" />
            </form>
            <nav aria-label="Categorias">
              <ul className="p-cats">
                <li><Link href="/" aria-current={!category ? "page" : undefined} onClick={() => { setCategory(""); }}>Todas</Link></li>
                {categories.map((item) => (
                  <li key={item.slug}><Link href={`/categoria/${item.slug}`} aria-current={category === item.slug ? "page" : undefined} onClick={() => { setCategory(item.slug); }}>{item.name}</Link></li>
                ))}
              </ul>
            </nav>
          </aside>

          <main className="p-feed" id="ultimas">
            <h1 className="p-context">{categoryName ?? "Últimas notícias de tecnologia"}</h1>
            {query && <p className="p-feedback" role="status">{filteredArticles.length ? `${filteredArticles.length} notícia(s) encontrada(s) para “${query}”.` : `Nenhum resultado para “${query}”.`}</p>}
            {dataError ? (
              <div className="p-empty"><h2>Não foi possível carregar as notícias.</h2><p>Atualize a página em instantes. Se o problema continuar, volte mais tarde.</p></div>
            ) : filteredArticles.length ? (
              <div className="p-river">
                {lead && renderItem(lead, true)}
                {feedItems}
              </div>
            ) : !query ? (
              <div className="p-empty"><h2>{category ? "Ainda não há notícias nesta categoria." : "As notícias ainda não chegaram."}</h2><p>{category ? "Volte mais tarde ou escolha outra categoria." : "Elas aparecem aqui assim que as fontes forem sincronizadas, a cada hora."}</p></div>
            ) : null}
          </main>

          <div className="p-extras">
            {popularArticles.length > 0 && (
              <section aria-labelledby="popular-title">
                <h2 id="popular-title">Mais lidas</h2>
                <ul className="p-popular">
                  {popularArticles.slice(0, 4).map((article) => (
                    <li key={article.id}><Link href={`/noticia/${article.slug}`}>{article.title}</Link><small>{article.source_name}, {article.views} leitura(s)</small></li>
                  ))}
                </ul>
              </section>
            )}
            <section className="p-news" aria-labelledby="news-title">
              <h2 id="news-title">Newsletter</h2>
              <p>Cadastre seu e-mail e confirme pelo link que enviaremos para receber as principais notícias de tecnologia.</p>
              <button className="p-btn" onClick={openNewsletter}>Cadastrar e-mail</button>
            </section>
          </div>
        </div>

        <footer className="p-footer">
          <p>Reunimos os títulos e resumos publicados pelas fontes. A matéria completa fica no site original.</p>
          <nav aria-label="Rodapé">
            <button onClick={openNewsletter}>Newsletter</button>
            <Link href="/privacidade">Privacidade</Link>
            <a href="mailto:contato@anselmotechnoticias.example">Contato</a>
            <Link href="/admin">Painel</Link>
          </nav>
        </footer>
      </div>

      <NewsletterInvite />
    </div>
  );
}
