"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthorizedAdmin } from "@/lib/admin";
import { getAuth } from "@/lib/auth/server";
import { clientAddressFrom, consumeRateLimit } from "@/lib/rate-limit";

export type SignInState = { error: string };

const invalidCredentials = "E-mail ou senha inválidos.";

export async function signInAdmin(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!process.env.ADMIN_EMAIL?.trim()) return { error: "Configure ADMIN_EMAIL no ambiente do servidor antes de entrar." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 1 || password.length > 256) {
    return { error: "Informe um e-mail e uma senha válidos." };
  }
  if (!await withinSignInLimit()) return { error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." };
  try {
    // Todo e-mail passa pelo Neon Auth, para que o tempo de resposta não revele qual é o do admin.
    const auth = getAuth();
    const result = await auth.signIn.email({ email, password });
    if (result.error) return { error: invalidCredentials };
    const user = (await auth.getSession()).data?.user;
    if (!isAuthorizedAdmin(user)) {
      await auth.signOut();
      // A senha já foi aceita: só aqui é seguro explicar por que a conta do ADMIN_EMAIL não entrou.
      if (user?.email?.toLowerCase() === process.env.ADMIN_EMAIL?.trim().toLowerCase()) {
        return { error: "Esta conta ainda não tem o e-mail verificado. Verifique o e-mail no Neon Auth ou configure ADMIN_USER_ID no servidor." };
      }
      return { error: invalidCredentials };
    }
  } catch {
    return { error: "Não foi possível entrar agora. Confira sua conexão e tente novamente." };
  }
  redirect("/admin");
}

// O limite é uma camada extra: se ele falhar (segredo ou tabela ausentes), o login continua funcionando.
async function withinSignInLimit(): Promise<boolean> {
  try {
    return await consumeRateLimit("admin-sign-in", clientAddressFrom(await headers()), 10, 15);
  } catch (error) {
    console.error("Limite de login indisponível:", error instanceof Error ? error.message : "erro desconhecido");
    return true;
  }
}

export async function signOutAdmin() {
  await getAuth().signOut();
  redirect("/admin/entrar");
}
