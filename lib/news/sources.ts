export type NewsSource = {
  name: string;
  feedUrl: string;
  category: string;
};

// Lista editorial inicial: veículos reconhecidos; importar somente campos publicados no RSS.
export const newsSources: NewsSource[] = [
  { name: "Tecnoblog", feedUrl: "https://tecnoblog.net/feed/", category: "Tecnologia" },
  { name: "Canaltech", feedUrl: "https://canaltech.com.br/rss/", category: "Tecnologia" },
  { name: "The Verge", feedUrl: "https://www.theverge.com/rss/index.xml", category: "Tecnologia" },
];
