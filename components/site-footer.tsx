"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { categories } from "@/lib/content";
import { openNewsletter, subscribeNewsletter, type NewsletterResult } from "@/components/newsletter-invite";
import { TurnstileField, type TurnstileHandle } from "@/components/turnstile-field";

// Categorias em destaque no rodapé, na ordem de exibição. Os nomes e endereços vêm de lib/content.ts.
const footerCategorySlugs = ["tecnologia", "inteligencia-artificial", "seguranca-digital", "ciencia-inovacao", "aplicativos", "startups"];
const footerCategories = footerCategorySlugs.flatMap((slug) => categories.filter((item) => item.slug === slug));

// Só entram links para páginas que existem. Sobre nós, Contato e Termos de Uso entram aqui quando forem criados.
const institutionalLinks: { label: string; href: string }[] = [
  { label: "Política de Privacidade", href: "/privacidade" },
];

type SocialNetwork = "github" | "instagram" | "linkedin" | "x" | "youtube";

// Perfis oficiais do portal. A área de redes sociais só aparece quando houver ao menos um.
const socialLinks: { network: SocialNetwork; label: string; href: string }[] = [
  { network: "instagram", label: "Instagram", href: "https://www.instagram.com/anselmo.tech/" },
  { network: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/anselmoaxo" },
];

const socialIcons: Record<SocialNetwork, string> = {
  github: "M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z",
  instagram: "M12 2.2c3.2 0 3.58 0 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58 0-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.17 15.58 2.16 15.2 2.16 12s0-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16Zm0 4.86a4.94 4.94 0 1 0 0 9.88 4.94 4.94 0 0 0 0-9.88Zm0 8.15a3.21 3.21 0 1 1 0-6.42 3.21 3.21 0 0 1 0 6.42Zm5.14-9.5a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3Z",
  linkedin: "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z",
  x: "M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z",
  youtube: "M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z",
};

function currentYear() {
  return new Date().toLocaleDateString("pt-BR", { year: "numeric", timeZone: "America/Sao_Paulo" });
}

export function SiteFooter() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<NewsletterResult | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileHandle>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    setSaving(true);
    const outcome = await subscribeNewsletter(email, consent, turnstileToken);
    if (turnstileToken) turnstileRef.current?.reset();
    setSaving(false);
    setResult(outcome);
    if (outcome.tone === "success") {
      setEmail("");
      setConsent(false);
    }
  }

  const invalid = result?.tone === "error";

  return (
    <footer className="p-foot">
      <div className="p-wrap p-foot-grid">
        <section className="p-foot-about" aria-labelledby="foot-brand">
          <Link href="/" className="p-brand" id="foot-brand" aria-label="Anselmo Tech Notícias, início"><span className="p-dot" aria-hidden="true" />Anselmo Tech <b>Notícias</b></Link>
          <p>Tecnologia explicada com clareza. Reunimos títulos e resumos das principais fontes; a matéria completa fica no site original.</p>
          {socialLinks.length > 0 && (
            <ul className="p-social" aria-label="Redes sociais">
              {socialLinks.map((item) => (
                <li key={item.network}>
                  <a href={item.href} target="_blank" rel="noopener noreferrer" aria-label={`${item.label} (abre em nova aba)`}>
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path fill="currentColor" d={socialIcons[item.network]} /></svg>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <nav className="p-foot-col" aria-labelledby="foot-cats">
          <h2 id="foot-cats">Categorias</h2>
          <ul>
            {footerCategories.map((item) => <li key={item.slug}><Link href={`/categoria/${item.slug}`}>{item.name}</Link></li>)}
          </ul>
        </nav>

        <nav className="p-foot-col" aria-labelledby="foot-inst">
          <h2 id="foot-inst">Institucional</h2>
          <ul>
            {institutionalLinks.map((item) => <li key={item.href}><Link href={item.href}>{item.label}</Link></li>)}
            <li><button type="button" onClick={openNewsletter}>Newsletter</button></li>
          </ul>
        </nav>

        <section className="p-foot-news" aria-labelledby="foot-news">
          <h2 id="foot-news">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M3 6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-11Zm.5-.5 8.5 7 8.5-7" /></svg>
            Tecnologia sem ruído, todo dia
          </h2>
          <p>Assine a newsletter da Anselmo Tech Notícias e receba as principais notícias de tecnologia direto no seu e-mail.</p>
          <form onSubmit={(event) => void submit(event)} noValidate aria-busy={saving}>
            <label htmlFor="foot-email">E-mail</label>
            <input id="foot-email" type="email" autoComplete="email" maxLength={254} placeholder="Digite seu e-mail" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={invalid || undefined} aria-describedby="foot-status" required />
            <button className="p-foot-submit" type="submit" disabled={saving}>{saving ? "Assinando…" : "Assinar"}</button>
            <label className="p-foot-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> <span>Autorizo o envio de novidades para este e-mail e li a <Link href="/privacidade">Política de Privacidade</Link>.</span></label>
            <TurnstileField ref={turnstileRef} onToken={setTurnstileToken} />
            <p className="p-foot-status" id="foot-status" data-tone={result?.tone} role="status" aria-live="polite">{result?.message}</p>
          </form>
        </section>
      </div>

      <div className="p-wrap p-foot-bottom">
        <p>© <span suppressHydrationWarning>{currentYear()}</span> Anselmo Tech Notícias. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
