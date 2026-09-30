import { Portal } from "@/components/portal";
import { listPopularNews, listPublishedNews } from "@/lib/news/repository";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const [articles, popularArticles] = await Promise.all([listPublishedNews(), listPopularNews()]);
    return <Portal initialArticles={articles} popularArticles={popularArticles} />;
  } catch {
    return <Portal dataError />;
  }
}
