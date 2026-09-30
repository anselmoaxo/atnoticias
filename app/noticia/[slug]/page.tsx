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

  return <main className="article-page">
    <header className="article-top wrap"><Link href="/" className="brand" aria-label="Anselmo Tech Notícias, início"><span className="brand-mark">AT</span><span className="brand-name">anselmo<span> tech notícias</span></span></Link><Link href="/" className="back-link">← Voltar às notícias</Link></header>
    <article className="article-reading">
      <Link className="article-category" href={category ? `/categoria/${category.slug}` : "/"}>{article.category}</Link>
      <h1>{article.title}</h1>
      <p className="article-lead">{article.summary}</p>
      <div className="article-byline"><span>{article.source_name}</span><span>·</span><time dateTime={article.published_at}>{date}</time><span>·</span><span>{readingMinutes} min de leitura</span></div>
      {article.image_url ? <div className="article-cover"><Image src={article.image_url} alt="" width={1200} height={675} sizes="(max-width: 760px) 100vw, 840px" unoptimized priority /></div> : null}
      <div className="article-copy"><p>{article.summary}</p><p className="source-note">Esta página mostra o título e a descrição publicados no feed de {article.source_name}. Para ler a matéria completa, acesse a publicação original.</p><a className="dark-button" href={article.source_url} target="_blank" rel="noopener noreferrer">Ler matéria na fonte original <span>↗</span></a></div>
    </article>
  </main>;
}
