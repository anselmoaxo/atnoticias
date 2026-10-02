import type { Metadata } from "next";
import Link from "next/link";
import { unsubscribeNewsletterToken } from "@/lib/newsletter/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cancelar inscrição", robots: { index: false } };

type Props = { searchParams: Promise<{ token?: string; ok?: string }> };

async function unsubscribe(formData: FormData) {
  "use server";
  const { redirect } = await import("next/navigation");
  const result = await unsubscribeNewsletterToken(String(formData.get("token") ?? "")).catch(() => "invalid" as const);
  redirect(`/newsletter/cancelar?ok=${result === "unsubscribed" ? "1" : "0"}`);
}

// O cancelamento pede um clique no botão: leitores de e-mail que abrem links sozinhos não descadastram ninguém.
export default async function UnsubscribePage({ searchParams }: Props) {
  const { token, ok } = await searchParams;
  const state = ok === "1" ? "done" : ok === "0" || !token ? "invalid" : "ask";
  return <div className="p-site">
    <div className="p-wrap"><header className="p-header"><Link href="/" className="p-brand" aria-label="Anselmo Tech Notícias, início"><span className="p-dot" aria-hidden="true" />Anselmo Tech <b>Notícias</b></Link></header></div>
    <main className="p-article">
      {state === "ask" && <>
        <h1>Cancelar inscrição</h1>
        <p className="p-lede">Clique no botão para parar de receber a newsletter da Anselmo Tech Notícias neste e-mail.</p>
        <form action={unsubscribe}><input type="hidden" name="token" value={token} /><button className="p-btn" type="submit">Cancelar inscrição</button></form>
      </>}
      {state === "done" && <>
        <h1>Inscrição cancelada</h1>
        <p className="p-lede">Pronto. Você não vai receber mais a newsletter neste e-mail. Se mudar de ideia, é só se inscrever de novo na página inicial.</p>
        <Link className="p-btn" href="/">Ver as notícias</Link>
      </>}
      {state === "invalid" && <>
        <h1>Link inválido</h1>
        <p className="p-lede">Não encontramos uma inscrição para este link. Use o link do e-mail mais recente da newsletter.</p>
        <Link className="p-btn" href="/">Voltar ao início</Link>
      </>}
    </main>
  </div>;
}
