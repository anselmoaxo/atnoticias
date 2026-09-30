export const categories = [
  { name: "Inteligência artificial", slug: "inteligencia-artificial", short: "IA" },
  { name: "Aplicativos", slug: "aplicativos", short: "Apps" },
  { name: "Segurança digital", slug: "seguranca-digital", short: "Segurança" },
  { name: "Celulares", slug: "celulares", short: "Celulares" },
  { name: "Startups", slug: "startups", short: "Startups" },
  { name: "Games", slug: "games", short: "Games" },
];

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
