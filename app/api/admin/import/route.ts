import { requireAdminApi } from "@/lib/admin";
import { importNews } from "@/lib/news/importer";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    return Response.json(await importNews(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Falha ao consultar os feeds. Tente novamente mais tarde." }, { status: 503 });
  }
}
