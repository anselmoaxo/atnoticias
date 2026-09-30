import type { Metadata } from "next";
import { Portal } from "@/components/portal";
import { categories } from "@/lib/content";

type Props = { params: Promise<{ categoria: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria } = await params;
  const category = categories.find((item) => item.slug === categoria);
  return { title: category?.name ?? "Categoria", description: `Notícias de ${category?.name ?? "tecnologia"} na Anselmo Tech Notícias.` };
}

export default async function CategoryPage({ params }: Props) {
  const { categoria } = await params;
  const category = categories.find((item) => item.slug === categoria);
  return <Portal initialCategory={category?.slug ?? categoria} />;
}
