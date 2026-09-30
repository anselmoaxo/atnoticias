"use client";

import { useActionState } from "react";
import { signInAdmin, type SignInState } from "@/app/admin/entrar/actions";

const initialState: SignInState = { error: "" };

export function AdminLogin() {
  const [state, formAction, pending] = useActionState(signInAdmin, initialState);
  return <section className="login-card" aria-labelledby="login-title">
    <div className="section-overline">ACESSO RESTRITO</div><h1 id="login-title">Entrar no painel<span className="heading-dot">.</span></h1>
    <p>Use o e-mail cadastrado no Neon Auth para acessar a área administrativa.</p>
    <form action={formAction} className="editor-form">
      <label htmlFor="admin-email">E-mail</label><input id="admin-email" name="email" type="email" autoComplete="username" required maxLength={254} />
      <label htmlFor="admin-password">Senha</label><input id="admin-password" name="password" type="password" autoComplete="current-password" required maxLength={256} />
      <p className="login-error" role="alert" aria-live="polite">{state.error}</p>
      <button className="dark-button" type="submit" disabled={pending}>{pending ? "Entrando…" : "Entrar"}<span aria-hidden="true">↗</span></button>
    </form>
    <small>O cadastro público está desativado. Somente a conta autorizada pode acessar o painel.</small>
  </section>;
}
