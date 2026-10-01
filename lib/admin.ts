import { getAuth } from "@/lib/auth/server";

export type AuthUser = { id?: string | null; email?: string | null; emailVerified?: boolean | null };

/**
 * O admin precisa ter o e-mail de ADMIN_EMAIL e, além disso, ser a conta de ADMIN_USER_ID
 * (quando configurado) ou ter o e-mail verificado. Só o texto do e-mail não basta.
 */
export function isAuthorizedAdmin(user: AuthUser | null | undefined): boolean {
  const allowlistedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!allowlistedEmail || !user?.email || user.email.toLowerCase() !== allowlistedEmail) return false;
  const allowlistedId = process.env.ADMIN_USER_ID?.trim();
  if (allowlistedId) return user.id === allowlistedId;
  return user.emailVerified === true;
}

export async function getAdminSession() {
  if (!process.env.ADMIN_EMAIL?.trim()) return null;
  const { data } = await getAuth().getSession();
  const user = data?.user;
  if (!user || !isAuthorizedAdmin(user)) return null;
  return user;
}

export async function requireAdminApi() {
  const user = await getAdminSession();
  if (!user) return Response.json({ error: "Acesso não autorizado." }, { status: 401 });
  return null;
}
