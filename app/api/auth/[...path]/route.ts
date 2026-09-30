import { getAuth } from "@/lib/auth/server";

export const runtime = "nodejs";

const blocked = () => Response.json({ message: "Cadastro público desativado." }, { status: 404 });

async function registrationDisabled(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return request.method === "POST" && path[0] === "sign-up";
}

const handlers = () => getAuth().handler();

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return (await handlers()).GET(request, context);
}

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  if (await registrationDisabled(request, context)) return blocked();
  return (await handlers()).POST(request, context);
}

export async function PUT(request: Request, context: { params: Promise<{ path: string[] }> }) {
  if (await registrationDisabled(request, context)) return blocked();
  return (await handlers()).PUT(request, context);
}

export async function PATCH(request: Request, context: { params: Promise<{ path: string[] }> }) {
  if (await registrationDisabled(request, context)) return blocked();
  return (await handlers()).PATCH(request, context);
}

export async function DELETE(request: Request, context: { params: Promise<{ path: string[] }> }) {
  if (await registrationDisabled(request, context)) return blocked();
  return (await handlers()).DELETE(request, context);
}
