import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categories } from "@/lib/content";
import { getNewsBySlug, incrementNewsView } from "@/lib/news/repository";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const article = await getNewsBySlug(slug);
    if (!article) return { title: "Notícia não encontrada" };
    return {
      title: article.title,
      description: article.summary,
      alternates: { canonical: `/noticia/${article.slug}` },
      openGraph: { title: article.title, description: article.summary, type: "article", publishedTime: article.published_at, images: article.image_url ? [article.image_url] : [] },
    };
  } catch { return { title: "Notícia" }; }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,140}$/i.test(slug)) notFound();
  let article;
  try { article = await getNewsBySlug(slug); } catch { article = null; }
  if (!article) notFound();
  await incrementNewsView(article.id).catch(() => undefined);
  const category = categories.find((item) => item.name === article.category);
  const date = new Date(article.published_at).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Sao_Paulo" });
  const readingMinutes = Math.max(1, Math.ceil(`${article.title} ${article.summary}`.trim().split(/\s+/).length / 220));

  return <div className="p-site">
    <div className="p-wrap"><header className="p-header"><Link href="/" className="p-brand" aria-label="Anselmo Tech Notícias, início"><span className="p-dot" aria-hidden="true" />Anselmo Tech <b>Notícias</b></Link><Link href="/" className="p-linkbtn">Todas as notícias</Link></header></div>
    <main><article className="p-article">
      <Link className="p-cat" href={category ? `/categoria/${category.slug}` : "/"}>{article.category}</Link>
      <h1>{article.title}</h1>
      <p className="p-lede">{article.summary}</p>
      <div className="p-byline"><b>{article.source_name}</b><time dateTime={article.published_at}>{date}</time><span>{readingMinutes} min de leitura</span></div>
      {article.image_url ? <div className="p-cover"><Image src={article.image_url} alt="" width={1200} height={675} sizes="(max-width: 760px) 100vw, 700px" unoptimized priority /></div> : null}
      <p className="p-note">Esta página mostra o título e a descrição publicados por {article.source_name}. Para ler a matéria completa, acesse o site original.</p>
      <a className="p-btn" href={article.source_url} target="_blank" rel="noopener noreferrer">Ler a matéria em {article.source_name}</a>
    </article></main>
  </div>;
}
