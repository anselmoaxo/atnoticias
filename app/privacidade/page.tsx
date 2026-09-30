import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacidade" };

export default function PrivacyPage() {
  return <main className="privacy-page"><Link href="/" className="brand"><span className="brand-mark">AT</span><span className="brand-name">anselmo<span> tech notícias</span></span></Link><div className="section-overline">INSTITUCIONAL</div><h1>Privacidade<span className="heading-dot">.</span></h1><p>Esta versão demonstrativa não coleta nem armazena endereços de e-mail. O formulário de newsletter valida os campos no navegador, mas informa que a inscrição não pode ser concluída sem uma integração de serviço.</p><p>A preferência para adiar o convite da newsletter é guardada localmente no navegador por até sete dias. Ela não é enviada a um servidor.</p><p>Antes de publicar o portal e ativar cadastro de usuários ou newsletter, configure uma política de privacidade adequada às integrações e ao tratamento de dados adotados.</p><Link className="hero-link" href="/">← Voltar ao início</Link></main>;
}
