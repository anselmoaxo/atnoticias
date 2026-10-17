import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CollectorAdmin } from "@/components/collector-admin";
import { getAdminSession } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fontes e coleta" };

export default async function CollectorPage() {
  const user = await getAdminSession();
  if (!user) redirect("/admin/entrar");
  return <CollectorAdmin email={user.email} />;
}
