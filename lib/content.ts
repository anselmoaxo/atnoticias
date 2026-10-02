export const categories = [
  { name: "Inteligência artificial", slug: "inteligencia-artificial", short: "IA" },
  { name: "Aplicativos", slug: "aplicativos", short: "Apps" },
  { name: "Segurança digital", slug: "seguranca-digital", short: "Segurança" },
  { name: "Celulares", slug: "celulares", short: "Celulares" },
  { name: "Computadores", slug: "computadores", short: "PCs" },
  { name: "Startups", slug: "startups", short: "Startups" },
  { name: "Ciência e inovação", slug: "ciencia-inovacao", short: "Ciência" },
  { name: "Games", slug: "games", short: "Games" },
  { name: "Telecomunicações", slug: "telecomunicacoes", short: "Telecom" },
  { name: "Tecnologia", slug: "tecnologia", short: "Tecnologia" },
];

export type NewsArticle = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  author: string | null;
  image_url: string | null;
  source_name: string;
  source_url: string;
  published_at: string;
  views: number;
  status: "published" | "archived";
  source_type: "editorial" | "official";
  language: "pt-BR" | "en";
  image_credit: string | null;
  relevance: number;
};
