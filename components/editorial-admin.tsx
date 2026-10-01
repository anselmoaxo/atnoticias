"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { signOutAdmin } from "@/app/admin/entrar/actions";
import { categories, type NewsArticle } from "@/lib/content";
import type { NewsletterSubscriber } from "@/lib/newsletter/repository";

function localDateInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 16);
}

export function EditorialAdmin({ email }: { email: string }) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState(categories[0].name);
  const [author, setAuthor] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [status, setStatus] = useState<"published" | "archived">("published");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [subscriberLoading, setSubscriberLoading] = useState(true);
  const [subscriberError, setSubscriberError] = useState("");
  const [subscriberMessage, setSubscriberMessage] = useState("");
  const [subscriberBusyId, setSubscriberBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/news", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar as notícias.");
      setArticles(data.articles as NewsArticle[]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar as notícias.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const reloadSubscribers = useCallback(async () => {
    setSubscriberLoading(true);
    setSubscriberError("");
    try {
      const response = await fetch("/api/admin/newsletter", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar os inscritos.");
      setSubscribers(data.subscribers as NewsletterSubscriber[]);
    } catch (reason) {
      setSubscriberError(reason instanceof Error ? reason.message : "Não foi possível carregar os inscritos.");
    } finally { setSubscriberLoading(false); }
  }, []);

  useEffect(() => { void reloadSubscribers(); }, [reloadSubscribers]);

  function beginEdit(article: NewsArticle) {
    setEditingId(article.id); setTitle(article.title); setSummary(article.summary); setCategory(article.category);
    setAuthor(article.author ?? ""); setImageUrl(article.image_url ?? ""); setPublishedAt(localDateInput(article.published_at)); setStatus(article.status);
    setNotice("");
  }

  function cancelEdit() { setEditingId(null); setTitle(""); setSummary(""); }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/news/${editingId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, summary, category, author, imageUrl, publishedAt, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar.");
      cancelEdit(); setNotice("Alterações salvas."); await reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar."); }
    finally { setSaving(false); }
  }

  async function runImport() {
    setImporting(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/import", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "A importação falhou.");
      const failed = data.errors?.length ?? 0;
      setNotice(`${data.articlesAdded} notícia(s) nova(s) importada(s); ${data.feedsChecked} feeds consultados${failed ? `, ${failed} com erro` : ""}.`);
      await reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "A importação falhou."); }
    finally { setImporting(false); }
  }

  async function deleteArticle(article: NewsArticle) {
    if (!window.confirm(`Excluir “${article.title}”?`)) return;
    setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/news/${article.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível excluir.");
      setArticles((current) => current.filter((item) => item.id !== article.id)); setNotice("Notícia excluída.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível excluir."); }
  }

  async function updateSubscriberStatus(subscriber: NewsletterSubscriber) {
    const status = subscriber.status === "subscribed" ? "unsubscribed" : "subscribed";
    setSubscriberBusyId(subscriber.id); setSubscriberError(""); setSubscriberMessage("");
    try {
      const response = await fetch(`/api/admin/newsletter/${subscriber.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível atualizar o inscrito.");
      setSubscriberMessage(status === "unsubscribed" ? "Inscrição cancelada." : "Inscrição reativada.");
      await reloadSubscribers();
    } catch (reason) { setSubscriberError(reason instanceof Error ? reason.message : "Não foi possível atualizar o inscrito."); }
    finally { setSubscriberBusyId(null); }
  }

  async function deleteSubscriber(subscriber: NewsletterSubscriber) {
    if (!window.confirm(`Excluir o endereço ${subscriber.email} da lista?`)) return;
    setSubscriberBusyId(subscriber.id); setSubscriberError(""); setSubscriberMessage("");
    try {
      const response = await fetch(`/api/admin/newsletter/${subscriber.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível excluir o inscrito.");
      setSubscriberMessage("Endereço excluído da lista.");
      await reloadSubscribers();
    } catch (reason) { setSubscriberError(reason instanceof Error ? reason.message : "Não foi possível excluir o inscrito."); }
    finally { setSubscriberBusyId(null); }
  }

  async function exportSubscribers() {
    setSubscriberError(""); setSubscriberMessage("");
    try {
      const response = await fetch("/api/admin/newsletter/export", { cache: "no-store" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Não foi possível exportar os inscritos.");
      }
      const downloadUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = downloadUrl; link.download = "anselmo-tech-inscritos-newsletter.csv"; link.click();
      URL.revokeObjectURL(downloadUrl);
      setSubscriberMessage("Lista exportada.");
    } catch (reason) { setSubscriberError(reason instanceof Error ? reason.message : "Não foi possível exportar os inscritos."); }
  }

  const visible = articles.filter((article) => `${article.title} ${article.source_name} ${article.category}`.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")));

  return <main className="admin-page">
    <header className="admin-top"><Link href="/" className="brand"><span className="brand-mark">AT</span><span className="brand-name">anselmo<span> tech notícias</span></span></Link><div className="admin-user"><span>{email}</span><form action={signOutAdmin}><button className="back-link" type="submit">Sair</button></form></div></header>
    <div className="admin-wrap">
      <div className="admin-title-row"><div><div className="section-overline">ÁREA DE GESTÃO</div><h1>Painel editorial<span className="heading-dot">.</span></h1><p>Notícias importadas dos feeds e publicadas automaticamente.</p></div><span className="admin-live-badge"><i /> CONECTADO AO NEON</span></div>
      <div className="admin-toolbar"><label className="admin-search-label" htmlFor="admin-search">Buscar no acervo</label><input id="admin-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Título, fonte ou categoria" /><button className="dark-button" type="button" onClick={() => void runImport()} disabled={importing}>{importing ? "Consultando feeds…" : "Buscar notícias agora"}<span aria-hidden="true">↻</span></button></div>
      <p className="admin-status" aria-live="polite">{error || notice}</p>
      <section className="admin-card editorial-list"><div className="admin-card-heading"><div><div className="section-overline">FONTES CONFIÁVEIS · ATUALIZAÇÃO A CADA HORA</div><h2>Acervo de notícias <span className="list-count">{articles.length}</span></h2></div></div>
        {loading ? <div className="admin-empty"><h3>Carregando notícias…</h3><p>Consultando o acervo no Neon.</p></div> : error && !articles.length ? <div className="admin-empty"><h3>Não foi possível carregar o acervo</h3><p>{error}</p><button className="text-button" type="button" onClick={() => void reload()}>Tentar novamente</button></div> : visible.length ? <div className="draft-list">{visible.map((article) => <article className="draft-row editorial-row" key={article.id}>
          <div className="draft-row-main"><span className={article.status === "published" ? "status-dot" : "status-dot archived-dot"} /><div><b>{article.title}</b><small>{article.source_name} · {article.category} · {article.status === "published" ? "Publicada" : "Arquivada"}</small></div></div>
          <div className="row-actions"><button type="button" onClick={() => beginEdit(article)}>Editar</button><button type="button" onClick={() => void deleteArticle(article)}>Excluir</button><Link href={`/noticia/${article.slug}`} target="_blank">Abrir</Link></div>
          {editingId === article.id && <form className="editor-form editorial-edit" onSubmit={saveEdit}>
            <label htmlFor={`edit-title-${article.id}`}>Título</label><input id={`edit-title-${article.id}`} value={title} onChange={(event) => setTitle(event.target.value)} required minLength={5} maxLength={240} />
            <label htmlFor={`edit-summary-${article.id}`}>Descrição do feed</label><textarea id={`edit-summary-${article.id}`} value={summary} onChange={(event) => setSummary(event.target.value)} required maxLength={900} rows={3} />
            <div className="form-two"><div><label htmlFor={`edit-category-${article.id}`}>Categoria</label><select id={`edit-category-${article.id}`} value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item.slug} value={item.name}>{item.name}</option>)}</select></div><div><label htmlFor={`edit-author-${article.id}`}>Autor</label><input id={`edit-author-${article.id}`} value={author} onChange={(event) => setAuthor(event.target.value)} maxLength={160} /></div></div>
            <div className="form-two"><div><label htmlFor={`edit-date-${article.id}`}>Data de publicação</label><input id={`edit-date-${article.id}`} type="datetime-local" value={publishedAt} onChange={(event) => setPublishedAt(event.target.value)} required /></div><div><label htmlFor={`edit-image-${article.id}`}>Imagem (URL https)</label><input id={`edit-image-${article.id}`} type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://…" /></div></div>
            <label htmlFor={`edit-status-${article.id}`}>Status</label><select id={`edit-status-${article.id}`} value={status} onChange={(event) => setStatus(event.target.value as "published" | "archived")}><option value="published">Publicada</option><option value="archived">Arquivada</option></select>
            <div className="admin-form-actions"><button className="dark-button" type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar alterações"}</button><button className="text-button" type="button" onClick={cancelEdit}>Cancelar</button></div>
          </form>}
        </article>)}</div> : <div className="admin-empty"><span className="empty-icon"><span>AT</span></span><h3>{search ? "Nenhuma notícia encontrada" : "Ainda não há notícias importadas"}</h3><p>{search ? "Altere a busca e tente novamente." : "A importação automática será executada pelo agendador. Você também pode buscar agora."}</p></div>}
      </section>
      <section className="admin-card newsletter-management">
        <div className="admin-card-heading"><div><div className="section-overline">CONSENTIMENTO E LISTA DE E-MAILS</div><h2>Newsletter <span className="list-count">{subscribers.length}</span></h2></div><button className="text-button newsletter-export" type="button" onClick={() => void exportSubscribers()}>Exportar CSV</button></div>
        <p className="admin-footnote">Os endereços autorizados ficam salvos no Neon. O envio de campanhas ainda não está conectado.</p>
        <p className="newsletter-status-message" role="status" aria-live="polite">{subscriberError || subscriberMessage}</p>
        {subscriberLoading ? <div className="newsletter-empty">Carregando inscritos…</div> : subscriberError && !subscribers.length ? <div className="newsletter-empty"><p>{subscriberError}</p><button className="text-button" type="button" onClick={() => void reloadSubscribers()}>Tentar novamente</button></div> : subscribers.length ? <div className="newsletter-table">{subscribers.map((subscriber) => <article className="newsletter-subscriber" key={subscriber.id}>
          <div><b>{subscriber.email}</b><small>Consentiu em {new Date(subscriber.consent_at).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}</small></div>
          <span className={subscriber.status === "subscribed" ? "newsletter-status" : "newsletter-status is-unsubscribed"}>{subscriber.status === "subscribed" ? "Inscrito" : "Cancelado"}</span>
          <div className="row-actions"><button type="button" disabled={subscriberBusyId === subscriber.id} onClick={() => void updateSubscriberStatus(subscriber)}>{subscriber.status === "subscribed" ? "Cancelar" : "Reativar"}</button><button type="button" disabled={subscriberBusyId === subscriber.id} onClick={() => void deleteSubscriber(subscriber)}>Excluir</button></div>
        </article>)}</div> : <div className="newsletter-empty">Ainda não há e-mails inscritos.</div>}
      </section>
      <p className="admin-footnote">O portal publica apenas títulos e descrições fornecidos pelos feeds, com link para a fonte original.</p>
    </div>
  </main>;
}
