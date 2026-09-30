export const categories = [
  { name: "Inteligência artificial", slug: "inteligencia-artificial", short: "IA" },
  { name: "Aplicativos", slug: "aplicativos", short: "Apps" },
  { name: "Segurança digital", slug: "seguranca-digital", short: "Segurança" },
  { name: "Celulares", slug: "celulares", short: "Celulares" },
  { name: "Computadores", slug: "computadores", short: "PCs" },
  { name: "Startups", slug: "startups", short: "Startups" },
  { name: "Ciência e inovação", slug: "ciencia-inovacao", short: "Ciência" },
  { name: "Games", slug: "games", short: "Games" },
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
};

export type Draft = {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  author: string;
  date: string;
  image: string;
  status: "Rascunho" | "Publicada" | "Arquivada";
};
