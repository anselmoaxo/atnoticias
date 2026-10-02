"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const dismissKey = "anselmo-tech-noticias-newsletter-dismissed-until";
const subscribedKey = "anselmo-tech-noticias-newsletter-subscribed";
const openEvent = "anselmo-tech-noticias:open-newsletter";
// Quem fecha o convite volta a vê-lo ao navegar depois deste intervalo.
const dismissMinutes = 15;

/** Abre o convite a pedido do visitante (botões "Newsletter"), mesmo que ele tenha fechado antes. */
export function openNewsletter() {
  window.dispatchEvent(new Event(openEvent));
}

function isSuppressed() {
  try {
    return window.localStorage.getItem(subscribedKey) === "1" || Number(window.localStorage.getItem(dismissKey) || 0) > Date.now();
  } catch {
    return false;
  }
}

/** Convite da newsletter: abre ao entrar no site e a cada navegação, salvo para quem já se inscreveu ou fechou há pouco. */
export function NewsletterInvite() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [messageTone, setMessageTone] = useState<"success" | "error">("error");
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isSuppressed()) return;
    const timer = window.setTimeout(() => setOpen(true), 800);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(openEvent, show);
    return () => window.removeEventListener(openEvent, show);
  }, []);

  useEffect(() => {
    if (open) {
      const active = document.activeElement;
      previousFocusRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
      dialogRef.current?.focus();
    } else {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  function closeNewsletter() {
    setOpen(false);
    setMessage("");
    try {
      window.localStorage.setItem(dismissKey, String(Date.now() + dismissMinutes * 60 * 1000));
    } catch { /* The invitation remains closable when local storage is unavailable. */ }
  }

  async function submitNewsletter(event: React.FormEvent<HTMLFormElement>) {
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
    setSaving(true);
    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent, website: "" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar sua inscrição.");
      setMessageTone("success");
      try {
        window.localStorage.setItem(subscribedKey, "1");
      } catch { /* Sem armazenamento local, o convite volta a aparecer na próxima visita. */ }
      setMessage(data.message ?? "Enviamos um e-mail de confirmação. Abra a mensagem e clique no link para ativar a inscrição.");
      setEmail("");
      setConsent(false);
    } catch (reason) {
      setMessageTone("error");
      setMessage(reason instanceof Error ? reason.message : "Não foi possível salvar sua inscrição agora.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;
  return (
<div className="p-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeNewsletter(); }}>
      <div className="p-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-description" tabIndex={-1} ref={dialogRef} onKeyDown={(event) => {
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
        <button className="p-close" aria-label="Fechar" onClick={closeNewsletter}>×</button>
        <h2 id="modal-title">Newsletter de tecnologia</h2>
        <p id="modal-description">Enviaremos uma mensagem para confirmar o seu e-mail. A inscrição só vale depois que você clicar no link.</p>
        <form onSubmit={(event) => void submitNewsletter(event)} noValidate>
          <label className="p-honeypot" aria-hidden="true">Deixe em branco<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
          <label htmlFor="newsletter-email">Seu e-mail</label>
          <input id="newsletter-email" type="email" autoComplete="email" maxLength={254} placeholder="voce@exemplo.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label className="p-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> <span>Autorizo o envio de novidades da Anselmo Tech Notícias para este e-mail.</span></label>
          <p className="p-status" data-tone={messageTone} role="status" aria-live="polite">{message}</p>
          <button className="p-btn" type="submit" disabled={saving}>{saving ? "Enviando…" : "Cadastrar e-mail"}</button>
        </form>
        <button className="p-later" onClick={closeNewsletter}>Agora não</button>
      </div>
    </div>
  );
}
