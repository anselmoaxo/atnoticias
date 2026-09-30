import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EditorialAdmin } from "@/components/editorial-admin";
import { getAdminSession } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Painel editorial" };

export default async function AdminPage() {
  const user = await getAdminSession();
  if (!user) redirect("/admin/entrar");
  return <EditorialAdmin email={user.email} />;
}
