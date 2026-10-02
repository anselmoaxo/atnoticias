import { requireAdminApi } from "@/lib/admin";
import { getDb } from "@/lib/db";
import { frequencyOptions } from "@/lib/news/source-admin";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Envie dados válidos." }, { status: 400 }); }
  const data = (body ?? {}) as Record<string, unknown>;
  const frequency = Number(data.frequency_minutes);
  const maxAge = Number(data.max_age_hours);
  if (typeof data.enabled !== "boolean") return Response.json({ error: "Indique se a coleta automática fica ligada." }, { status: 400 });
  if (!frequencyOptions.includes(frequency as (typeof frequencyOptions)[number])) return Response.json({ error: "Escolha uma frequência da lista." }, { status: 400 });
  if (!Number.isInteger(maxAge) || maxAge < 6 || maxAge > 168) return Response.json({ error: "A idade máxima precisa ficar entre 6 e 168 horas." }, { status: 400 });
  try {
    await getDb().query(
      "UPDATE news_collector_settings SET enabled = $1, frequency_minutes = $2, max_age_hours = $3, updated_at = now() WHERE id = 1",
      [data.enabled, frequency, maxAge],
    );
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Não foi possível salvar a configuração." }, { status: 503 });
  }
}
