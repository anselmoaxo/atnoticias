import { requireAdminApi } from "@/lib/admin";
import { listNewsletterSubscribers } from "@/lib/newsletter/repository";

export const runtime = "nodejs";

function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    const subscribers = await listNewsletterSubscribers();
    const lines = [
      ["E-mail", "Status", "Inscrito em", "Consentimento em", "Cancelado em"].map(csvCell).join(";"),
      ...subscribers.map((subscriber) => [
        subscriber.email,
        subscriber.status === "subscribed" ? "Inscrito" : "Cancelado",
        subscriber.created_at,
        subscriber.consent_at,
        subscriber.unsubscribed_at ?? "",
      ].map(csvCell).join(";")),
    ];
    return new Response(`\uFEFF${lines.join("\r\n")}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="anselmo-tech-inscritos-newsletter.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ error: "Não foi possível exportar os inscritos." }, { status: 503 });
  }
}
