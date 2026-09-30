import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminLogin } from "@/components/admin-login";
import { getAdminSession } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Entrar no painel" };

export default async function AdminLoginPage() {
  try { if (await getAdminSession()) redirect("/admin"); } catch { /* The login screen remains available if Auth is offline. */ }
  return <main className="admin-login-page"><header className="article-top wrap"><Link href="/" className="brand" aria-label="Anselmo Tech Notícias, início"><span className="brand-mark">AT</span><span className="brand-name">anselmo<span> tech notícias</span></span></Link><Link href="/" className="back-link">← Voltar ao portal</Link></header><AdminLogin /></main>;
}
