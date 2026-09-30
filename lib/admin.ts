import { getAuth } from "@/lib/auth/server";

export async function getAdminSession() {
  const allowlistedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!allowlistedEmail) return null;
  const { data } = await getAuth().getSession();
  const user = data?.user;
  if (!user?.email || user.email.toLowerCase() !== allowlistedEmail) return null;
  return user;
}

export async function requireAdminApi() {
  const user = await getAdminSession();
  if (!user) return Response.json({ error: "Acesso não autorizado." }, { status: 401 });
  return null;
}
