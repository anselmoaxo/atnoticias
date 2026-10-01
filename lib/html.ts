/** Escapa texto para uso em HTML (conteúdo ou atributo entre aspas). Use em todo template de e-mail. */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
