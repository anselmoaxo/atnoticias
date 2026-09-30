"use server";

import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/server";

export type SignInState = { error: string };

export async function signInAdmin(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const allowedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!allowedEmail) return { error: "Configure ADMIN_EMAIL no ambiente do servidor antes de entrar." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 1 || password.length > 256) {
    return { error: "Informe um e-mail e uma senha válidos." };
  }
  if (email !== allowedEmail) return { error: "E-mail ou senha inválidos." };
  try {
    const auth = getAuth();
    const result = await auth.signIn.email({ email, password });
    if (result.error) return { error: "E-mail ou senha inválidos." };
    const session = await auth.getSession();
    if (session.data?.user?.email?.toLowerCase() !== allowedEmail) {
      await auth.signOut();
      return { error: "Esta conta não tem acesso ao painel." };
    }
  } catch {
    return { error: "Não foi possível entrar agora. Confira sua conexão e tente novamente." };
  }
  redirect("/admin");
}

export async function signOutAdmin() {
  await getAuth().signOut();
  redirect("/admin/entrar");
}
