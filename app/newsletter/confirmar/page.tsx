import type { Metadata } from "next";
import Link from "next/link";
import { confirmNewsletterToken } from "@/lib/newsletter/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Confirmar inscrição", robots: { index: false } };

type Props = { searchParams: Promise<{ token?: string; ok?: string }> };

async function confirm(formData: FormData) {
  "use server";
  const { redirect } = await import("next/navigation");
  const result = await confirmNewsletterToken(String(formData.get("token") ?? "")).catch(() => "invalid" as const);
  redirect(`/newsletter/confirmar?ok=${result === "confirmed" ? "1" : "0"}`);
}

export default async function ConfirmPage({ searchParams }: Props) {
  const { token, ok } = await searchParams;
  const state = ok === "1" ? "done" : ok === "0" || !token ? "invalid" : "ask";
  return <div className="p-site">
    <div className="p-wrap"><header className="p-header"><Link href="/" className="p-brand" aria-label="Anselmo Tech Notícias, início"><span className="p-dot" aria-hidden="true" />Anselmo Tech <b>Notícias</b></Link></header></div>
    <main className="p-article">
      {state === "ask" && <>
        <h1>Confirmar inscrição</h1>
        <p className="p-lede">Clique no botão para ativar o recebimento da newsletter neste e-mail.</p>
        <form action={confirm}><input type="hidden" name="token" value={token} /><button className="p-btn" type="submit">Confirmar inscrição</button></form>
      </>}
      {state === "done" && <>
        <h1>Inscrição confirmada</h1>
        <p className="p-lede">Pronto. Você vai receber a newsletter da Anselmo Tech Notícias neste e-mail.</p>
        <Link className="p-btn" href="/">Ver as notícias</Link>
      </>}
      {state === "invalid" && <>
        <h1>Link inválido ou expirado</h1>
        <p className="p-lede">O link vale por 48 horas e só pode ser usado uma vez. Faça a inscrição de novo na página inicial para receber outro e-mail.</p>
        <Link className="p-btn" href="/">Voltar ao início</Link>
      </>}
    </main>
  </div>;
}
