export const MIN_SECRET_LENGTH = 32;

/** Lê o primeiro segredo configurado entre `names`; ignora valores com menos de 32 caracteres. */
export function readSecret(...names: string[]): string | null {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value.length >= MIN_SECRET_LENGTH ? value : null;
  }
  return null;
}
