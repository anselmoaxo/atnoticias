import { timingSafeEqual } from "node:crypto";
import { importNews } from "@/lib/news/importer";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || !supplied) return false;
  const expectedBuffer = Buffer.from(secret);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return Response.json({ error: "Não autorizado." }, { status: 401 });
  try {
    return Response.json(await importNews(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Falha ao importar os feeds. Consulte os logs do servidor." }, { status: 503 });
  }
}
