"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";

const scriptSrc = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** Chave pública que app/layout.tsx põe no <body> quando TURNSTILE_SITE_KEY e TURNSTILE_SECRET_KEY estão configuradas. */
export function turnstileSiteKey(): string {
  return typeof document === "undefined" ? "" : document.body.dataset.turnstileSiteKey ?? "";
}

type TurnstileApi = {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
};

declare global {
  interface Window { turnstile?: TurnstileApi }
}

let loading: Promise<TurnstileApi> | null = null;

// O script é inserido por código já confiável pela CSP ('strict-dynamic'), então não precisa de nonce.
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("TurnstileUnavailable")));
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error("TurnstileUnavailable"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export type TurnstileHandle = { reset(): void };

/** Verificação anti-robô do Cloudflare Turnstile. Cada token vale para um envio; chame reset() depois de enviar. */
export function TurnstileField({ onToken, ref }: { onToken(token: string): void; ref?: React.Ref<TurnstileHandle> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useImperativeHandle(ref, () => ({
    reset() {
      onTokenRef.current("");
      if (widgetRef.current && window.turnstile) window.turnstile.reset(widgetRef.current);
    },
  }), []);

  const [siteKey, setSiteKey] = useState("");

  useEffect(() => {
    const key = turnstileSiteKey();
    setSiteKey(key);
    if (!key) return;
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;
        widgetRef.current = turnstile.render(containerRef.current, {
          sitekey: key,
          action: "newsletter",
          language: "pt-br",
          size: "flexible",
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(""),
          "error-callback": () => onTokenRef.current(""),
        });
      })
      .catch(() => onTokenRef.current(""));
    return () => {
      cancelled = true;
      if (widgetRef.current && window.turnstile) window.turnstile.remove(widgetRef.current);
      widgetRef.current = null;
    };
  }, []);

  // O contêiner existe sempre, para o widget poder ser montado assim que o script carregar; sem chave fica vazio.
  return <div className={siteKey ? "p-turnstile" : undefined} ref={containerRef} />;
}
