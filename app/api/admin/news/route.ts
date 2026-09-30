import { requireAdminApi } from "@/lib/admin";
import { listAdminNews } from "@/lib/news/repository";

export const runtime = "nodejs";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    return Response.json({ articles: await listAdminNews() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível carregar as notícias." }, { status: 503 });
  }
}
