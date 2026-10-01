import { requireAdminApi } from "@/lib/admin";
import { listNewsletterSubscribers } from "@/lib/newsletter/repository";

export const runtime = "nodejs";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    return Response.json({ subscribers: await listNewsletterSubscribers() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível carregar os inscritos." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
