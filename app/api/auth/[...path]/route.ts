import { isAllowedAuthEndpoint } from "@/lib/auth/endpoints";
import { getAuth } from "@/lib/auth/server";

export const runtime = "nodejs";

type Context = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, context: Context) {
  const { path } = await context.params;
  if (!isAllowedAuthEndpoint(request.method, path)) {
    return Response.json({ message: "Endpoint de autenticação indisponível." }, { status: 404 });
  }
  const handlers = getAuth().handler();
  return request.method === "GET" ? handlers.GET(request, context) : handlers.POST(request, context);
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
