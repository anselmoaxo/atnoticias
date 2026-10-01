// O painel autentica pelo servidor (Server Actions); o navegador só precisa consultar e encerrar a sessão.
// Qualquer outro endpoint do Neon Auth (cadastro, login social, magic link, troca de e-mail...) fica fechado no proxy.
const allowedEndpoints = new Set(["GET get-session", "POST sign-out"]);

export function isAllowedAuthEndpoint(method: string, path: string[]): boolean {
  return allowedEndpoints.has(`${method.toUpperCase()} ${path.join("/")}`);
}
