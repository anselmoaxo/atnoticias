import type { Metadata } from "next";
import { Schibsted_Grotesk, Source_Serif_4 } from "next/font/google";
import { connection } from "next/server";
import "./globals.css";
import "./editorial.css";
import "./site.css";

const grotesk = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Anselmo Tech Notícias — Tecnologia, no seu ritmo",
    template: "%s | Anselmo Tech Notícias",
  },
  description:
    "Tecnologia explicada com clareza. Acompanhe notícias sobre inteligência artificial, apps, segurança digital, celulares, startups e games.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Anselmo Tech Notícias",
    title: "Anselmo Tech Notícias — Tecnologia, no seu ritmo",
    description: "Tecnologia explicada com clareza.",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Renderização dinâmica em todas as páginas: o Next.js só aplica o nonce da CSP (proxy.ts) em HTML gerado por requisição.
  await connection();
  return (
    <html lang="pt-BR" className={`${grotesk.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
