import type { Metadata } from "next";
import "./globals.css";

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
