import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacidade" };

export default function PrivacyPage() {
  return <main className="privacy-page"><Link href="/" className="brand"><span className="brand-mark">AT</span><span className="brand-name">anselmo<span> tech notícias</span></span></Link><div className="section-overline">INSTITUCIONAL</div><h1>Privacidade<span className="heading-dot">.</span></h1><p>Quando você informa seu e-mail e marca a autorização para receber novidades, o endereço e a data do consentimento são armazenados no banco de dados do portal para gerenciar a lista da newsletter. O envio de mensagens ainda não está ativado.</p><p>O responsável pelo portal pode consultar, atualizar o status ou excluir um endereço no painel administrativo. O portal não vende nem exibe publicamente esses dados.</p><p>A preferência para adiar o convite da newsletter é guardada localmente no navegador por até sete dias; ela não é enviada ao servidor.</p><Link className="hero-link" href="/">← Voltar ao início</Link></main>;
}
