"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { categories } from "@/lib/content";

const dismissKey = "anselmo-tech-noticias-newsletter-dismissed-until";

export function Portal({ initialCategory }: { initialCategory?: string }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory ?? "");
  const [newsletterOpen, setNewsletterOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  function wasDismissed() {
    try {
      return Number(window.localStorage.getItem(dismissKey) || 0) > Date.now();
    } catch {
      return false;
    }
  }

  useEffect(() => {
    if (wasDismissed()) return;
    const timer = window.setTimeout(() => setNewsletterOpen(true), 6500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if (!newsletterOpen && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("site-search")?.focus();
      }
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, [newsletterOpen]);

  useEffect(() => {
    if (newsletterOpen) {
      const active = document.activeElement;
      previousFocusRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
      dialogRef.current?.focus();
    } else {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
  }, [newsletterOpen]);

  function closeNewsletter() {
    setNewsletterOpen(false);
    setMessage("");
    try {
      window.localStorage.setItem(dismissKey, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    } catch { /* The invitation remains closable when local storage is unavailable. */ }
  }

  function openNewsletterIfAllowed() {
    if (!wasDismissed()) setNewsletterOpen(true);
  }

  function submitNewsletter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage("Confira o endereço de e-mail e tente novamente.");
      return;
    }
    if (!consent) {
      setMessage("Marque a autorização para receber os e-mails.");
      return;
    }
    setMessage("A inscrição ainda não está disponível: o serviço de newsletter não foi conectado, então seu e-mail não foi enviado nem salvo.");
  }

  function navigateCategory(slug: string) {
    setCategory(category === slug ? "" : slug);
    openNewsletterIfAllowed();
  }

  return (
    <>
      <header className="site-header">
        <div className="header-top wrap">
          <Link href="/" className="brand" aria-label="Anselmo Tech Notícias, início">
            <span className="brand-mark" aria-hidden="true">AT</span>
            <span className="brand-name">anselmo<span> tech notícias</span></span>
          </Link>
          <form className="search" role="search" onSubmit={(event) => event.preventDefault()}>
            <label className="sr-only" htmlFor="site-search">Buscar notícias</label>
            <span aria-hidden="true" className="search-icon">⌕</span>
            <input id="site-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar notícias..." />
            <kbd>Ctrl K</kbd>
          </form>
          <button className="newsletter-quick" onClick={() => setNewsletterOpen(true)}>Newsletter <span aria-hidden="true">↗</span></button>
        </div>
        <nav className="category-nav" aria-label="Categorias">
          <div className="wrap nav-inner">
          <Link className={!category ? "nav-link active" : "nav-link"} href="/" onClick={() => { setCategory(""); openNewsletterIfAllowed(); }}>Todas</Link>
            {categories.map((item) => (
              <Link key={item.slug} className={category === item.slug ? "nav-link active" : "nav-link"} href={`/categoria/${item.slug}`} onClick={() => navigateCategory(item.slug)}>{item.name}</Link>
            ))}
          </div>
        </nav>
      </header>

      <main className="wrap main-content">
        <div className="eyebrow"><span className="live-dot" /> TECNOLOGIA, NO SEU RITMO <span className="eyebrow-line" /></div>

        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="hero-kicker"><span className="kicker-square">T</span> UM NOVO JEITO DE ACOMPANHAR TECNOLOGIA</div>
            <h1 id="hero-title">O futuro acontece.<br /><em>A gente traduz.</em></h1>
            <p>Inteligência artificial, segurança, apps e tudo o que move o mundo digital — explicado com clareza, sem complicação.</p>
            <a className="hero-link" href="#ultimas">Explore as últimas notícias <span aria-hidden="true">↓</span></a>
            <div className="hero-meta"><span>INFORMAÇÃO COM CONTEXTO</span><span className="meta-separator">/</span><span>FEITA PARA VOCÊ</span></div>
          </div>
          <div className="hero-art" aria-label="Ilustração abstrata em tons de azul e verde" role="img">
            <div className="art-grid" />
            <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
            <div className="art-core"><span>t.</span></div>
            <div className="art-chip chip-one">IA <i /></div><div className="art-chip chip-two"><i /> DIGITAL</div>
            <div className="art-cross cross-one">+</div><div className="art-cross cross-two">+</div>
            <div className="art-caption"><span>IDEIAS EM MOVIMENTO</span><b>01 — 06</b></div>
          </div>
        </section>

        <section className="topic-strip" aria-label="Explore por assunto">
          <span className="topic-label">NA PAUTA</span>
          {categories.map((item, index) => <button className={category === item.slug ? "topic-pill selected" : "topic-pill"} key={item.slug} onClick={() => navigateCategory(item.slug)}><span>0{index + 1}</span>{item.short}<b aria-hidden="true">↗</b></button>)}
        </section>

        <section id="ultimas" className="news-section" aria-labelledby="latest-title">
          <div className="section-heading">
            <div><div className="section-overline">O QUE ESTÁ ACONTECENDO</div><h2 id="latest-title">{category ? categories.find((item) => item.slug === category)?.name ?? "Notícias" : "Últimas notícias"}<span className="heading-dot">.</span></h2></div>
            <span className="section-count">{query ? "BUSCA" : "ATUALIZADO AO LONGO DO DIA"} <i /></span>
          </div>
          {query && <p className="search-feedback">Não há notícias publicadas para “{query}”.</p>}
          <div className="empty-news">
            <div className="empty-icon" aria-hidden="true"><span>t.</span></div>
            <div className="empty-copy"><span className="empty-label">ESPAÇO PARA O QUE VEM AÍ</span><h3>A conversa começa por aqui.</h3><p>Ainda não há notícias publicadas. Quando houver conteúdo, você encontra reportagens, contexto e novidades por aqui.</p></div>
            <span className="empty-index">01 / 01</span>
          </div>
        </section>

        <section className="below-grid">
          <div className="popular-box"><div className="section-overline">LEITURAS EM DESTAQUE</div><h2>Mais populares<span className="heading-dot">.</span></h2><p>As notícias mais lidas vão aparecer aqui.</p><div className="popular-empty"><span>01</span><span>Sem notícias publicadas</span><span>—</span></div></div>
          <aside className="newsletter-card"><span className="newsletter-spark" aria-hidden="true">✳</span><div className="section-overline">UM E-MAIL. BOAS IDEIAS.</div><h2>Tecnologia,<br /><em>sem ruído.</em></h2><p>Uma seleção de novidades e leituras para acompanhar o que importa.</p><button className="dark-button" onClick={() => setNewsletterOpen(true)}>Quero receber <span>↗</span></button><small>Demonstração: serviço de envio não conectado.</small></aside>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap footer-main"><div><Link href="/" className="brand footer-brand"><span className="brand-mark">AT</span><span className="brand-name">anselmo<span> tech notícias</span></span></Link><p>Tecnologia, no seu ritmo.</p></div><div className="footer-links"><div><b>EXPLORE</b><a href="#ultimas">Últimas notícias</a><button onClick={() => setNewsletterOpen(true)}>Newsletter</button><Link href="/admin">Painel demonstrativo</Link></div><div><b>INSTITUCIONAL</b><a href="mailto:contato@anselmotechnoticias.example">Contato</a><a href="/privacidade">Privacidade</a></div></div></div>
        <div className="wrap footer-bottom"><span>© 2026 ANSELMO TECH NOTÍCIAS</span><span>FEITO PARA ENTENDER O QUE VEM AÍ <i>✳</i></span></div>
      </footer>

      {newsletterOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeNewsletter(); }}>
        <div className="newsletter-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-description" tabIndex={-1} ref={dialogRef} onKeyDown={(event) => {
          if (event.key === "Escape") closeNewsletter();
          if (event.key === "Tab") {
            const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])');
            if (!focusable?.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
          }
        }}>
          <button className="modal-close" aria-label="Fechar convite" onClick={closeNewsletter}>×</button>
          <span className="modal-icon" aria-hidden="true">✳</span><div className="section-overline">A TECNOLOGIA CHEGA ATÉ VOCÊ</div>
          <h2 id="modal-title">Boas ideias.<br /><em>Na sua caixa de entrada.</em></h2>
          <p id="modal-description">Novidades e leituras sobre tecnologia, em uma seleção ocasional. Demonstração: o serviço ainda não está conectado e seu e-mail não será enviado nem armazenado.</p>
          <form onSubmit={submitNewsletter} noValidate>
            <label htmlFor="newsletter-email">Seu e-mail</label><input id="newsletter-email" type="email" autoComplete="email" placeholder="voce@exemplo.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <label className="consent-line"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> <span>Autorizo o envio de novidades da Anselmo Tech Notícias para este e-mail.</span></label>
            <p className="modal-status" aria-live="polite">{message}</p>
            <button className="dark-button modal-submit" type="submit">Quero receber <span>↗</span></button>
          </form>
          <button className="later-button" onClick={closeNewsletter}>Agora não</button>
        </div>
      </div>}
    </>
  );
}
