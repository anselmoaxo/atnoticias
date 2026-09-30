"use client";

import Link from "next/link";
import { useState } from "react";
import { categories, type Draft } from "@/lib/content";

export function AdminPanel() {
  const [tab, setTab] = useState<"noticias" | "newsletter">("noticias");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [saved, setSaved] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(categories[0].name);
  const [author, setAuthor] = useState("");
  const [date, setDate] = useState("");
  const [image, setImage] = useState("");

  function saveDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = editing ?? crypto.randomUUID();
    const next: Draft = { id, title, summary, content, category, author, date, image, status: "Rascunho" };
    setDrafts((current) => editing ? current.map((item) => item.id === editing ? next : item) : [...current, next]);
    setSaved("Este rascunho existe apenas nesta sessão de demonstração. Nenhum dado foi gravado no servidor.");
    setEditing(null); setTitle(""); setSummary(""); setContent(""); setCategory(categories[0].name); setAuthor(""); setDate(""); setImage("");
  }

  function edit(item: Draft) { setEditing(item.id); setTitle(item.title); setSummary(item.summary); setContent(item.content); setCategory(item.category); setAuthor(item.author); setDate(item.date); setImage(item.image); window.scrollTo({ top: 0, behavior: "smooth" }); }

  return <main className="admin-page">
    <header className="admin-top"><Link href="/" className="brand"><span className="brand-mark">AT</span><span className="brand-name">anselmo<span> tech notícias</span></span></Link><Link href="/" className="back-link">← Voltar ao portal</Link></header>
    <div className="admin-wrap">
      <div className="admin-title-row"><div><div className="section-overline">ÁREA DE GESTÃO</div><h1>Painel editorial<span className="heading-dot">.</span></h1><p>Organize o conteúdo do portal em um só lugar.</p></div><span className="demo-badge"><i /> MODO DEMONSTRAÇÃO</span></div>
      <div className="demo-alert"><span>i</span><p><b>Esta área não tem autenticação nem persistência.</b> Não use para administrar conteúdo real. Cadastros ficam somente na memória desta sessão.</p></div>
      <div className="admin-tabs" role="tablist" aria-label="Seções do painel"><button role="tab" aria-selected={tab === "noticias"} className={tab === "noticias" ? "admin-tab active" : "admin-tab"} onClick={() => setTab("noticias")}>Notícias <span>{drafts.length}</span></button><button role="tab" aria-selected={tab === "newsletter"} className={tab === "newsletter" ? "admin-tab active" : "admin-tab"} onClick={() => setTab("newsletter")}>Newsletter <span>0</span></button></div>
      {tab === "noticias" ? <div className="admin-content-grid">
        <section className="admin-card"><div className="admin-card-heading"><div><div className="section-overline">CONTEÚDO</div><h2>{editing ? "Editar notícia" : "Nova notícia"}</h2></div><span className="draft-tag">RASCUNHO</span></div>
          <form className="editor-form" onSubmit={saveDraft}><label htmlFor="story-title">Título</label><input id="story-title" value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="Escreva um título claro" />
            <label htmlFor="story-summary">Resumo</label><textarea id="story-summary" rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Um resumo para apresentar a notícia" />
            <label htmlFor="story-content">Conteúdo</label><textarea id="story-content" rows={7} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Escreva o conteúdo da notícia" />
            <div className="form-two"><div><label htmlFor="story-category">Categoria</label><select id="story-category" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item.slug}>{item.name}</option>)}</select></div><div><label htmlFor="story-author">Autor</label><input id="story-author" value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="Nome do autor" /></div></div>
            <div className="form-two"><div><label htmlFor="story-date">Data de publicação</label><input id="story-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div><div><label htmlFor="story-cover">Imagem de capa</label><input id="story-cover" type="file" accept="image/*" onChange={(event) => setImage(event.target.files?.[0]?.name ?? "")} /></div></div>
            <div className="admin-form-actions"><button className="dark-button" type="submit">Salvar rascunho <span>↗</span></button>{editing && <button className="text-button" type="button" onClick={() => { setEditing(null); setTitle(""); setSummary(""); setContent(""); }}>Cancelar edição</button>}</div><p className="admin-status" aria-live="polite">{saved}</p>
          </form>
        </section>
        <section className="admin-card stories-card"><div className="admin-card-heading"><div><div className="section-overline">SEU CONTEÚDO</div><h2>Notícias <span className="list-count">{drafts.length}</span></h2></div></div>
          {drafts.length ? <div className="draft-list">{drafts.map((item) => <article className="draft-row" key={item.id}><div className="draft-row-main"><span className="status-dot" /><div><b>{item.title}</b><small>{item.category} · {item.status}</small></div></div><div className="row-actions"><button onClick={() => edit(item)} aria-label={`Editar ${item.title}`}>Editar</button><button onClick={() => setDrafts((current) => current.map((draft) => draft.id === item.id ? { ...draft, status: draft.status === "Arquivada" ? "Rascunho" : "Arquivada" } : draft))}>Arquivar</button><button onClick={() => setDrafts((current) => current.map((draft) => draft.id === item.id ? { ...draft, status: "Publicada" } : draft))}>Publicar</button><button onClick={() => setDrafts((current) => current.filter((draft) => draft.id !== item.id))}>Excluir</button></div></article>)}</div> : <div className="admin-empty"><span className="empty-icon"><span>t.</span></span><h3>Nenhuma notícia por aqui</h3><p>Crie um rascunho usando o formulário ao lado.</p></div>}
        </section>
      </div> : <section className="admin-card subscribers-card"><div className="admin-card-heading"><div><div className="section-overline">COMUNIDADE</div><h2>Inscritos da newsletter</h2></div><button className="export-button" disabled title="Exportação disponível quando uma fonte de dados estiver conectada">Exportar CSV ↗</button></div><div className="admin-empty"><span className="empty-icon"><span>@</span></span><h3>Nenhum inscrito cadastrado</h3><p>O formulário público ainda não está conectado a um serviço de newsletter. Nenhum endereço está sendo coletado.</p></div></section>}
      <p className="admin-footnote">Demonstração de interface · Os dados desaparecem ao sair ou recarregar a página.</p>
    </div>
  </main>;
}
