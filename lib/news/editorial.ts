// Regras editoriais sem IA: resumo curto a partir da descrição da fonte, relevância e detecção de notícias repetidas.

const SUMMARY_MAX = 320;

/** Resumo breve: frases inteiras da descrição até ~320 caracteres. Nunca o texto completo da matéria. */
export function briefSummary(text: string, max = SUMMARY_MAX): string {
  const clean = text.replace(/\s+/g, " ").replace(/\s*(?:\[(?:\.\.\.|…)\]|The post .* appeared first on .*|O post .* apareceu primeiro em .*)\s*$/i, "").trim();
  if (clean.length <= max) return clean;
  const sentences = clean.match(/[^.!?…]+[.!?…]+(?:["”’)]+)?\s*/g) ?? [];
  let summary = "";
  for (const sentence of sentences) {
    if ((summary + sentence).trim().length > max) break;
    summary += sentence;
  }
  summary = summary.trim();
  if (summary.length >= 60) return summary;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 40)).replace(/[\s,;:.–-]+$/, "")}…`;
}

const topicPattern = /intelig[eê]ncia artificial|\b(ia|ai|llm|gpt|chatgpt|openai|anthropic|claude|gemini|copilot|software|hardware|app|aplicativo|sistema operacional|android|ios|windows|linux|macos|chip|processador|gpu|nvidia|amd|intel|qualcomm|celular|smartphone|notebook|computador|seguran[cç]a|ciberataque|hacker|malware|ransomware|phishing|vazamento|vulnerabilidade|privacidade|lgpd|ci[eê]ncia|pesquisa|cientistas|inova[cç][aã]o|startup|rob[oô]|espa[cç]o|nasa|sat[eé]lite|qu[aâ]ntic[oa]|5g|6g|anatel|telecom|operadora|banda larga|fibra|internet|nuvem|cloud|dados|data center|big tech|google|apple|microsoft|meta|amazon|samsung|xiaomi|motorola|tesla|spacex|starlink|games?|jogos?|console|playstation|xbox|nintendo|steam)\b/i;
const brazilPattern = /\b(brasil|brasileir[oa]s?|anatel|lgpd|pix|gov\.br|receita federal|stf|tse|anpd|serpro|banco central|s[aã]o paulo|rio de janeiro|reais)\b|R\$\s?\d/i;
// Conteúdo que não é notícia de tecnologia: ofertas, cupons e entretenimento sem relação com o tema.
const offTopicTitle = /\b(cupom|cupons|cupon|oferta(s)? (do dia|imperd[ií]ve(l|is)|rel[aâ]mpago)|em promo[cç][aã]o|pre[cç]o (baixo|baixinho|imperd[ií]vel)|menor pre[cç]o|com desconto|desconto de \d+|black friday:? (ofertas|descontos)|hor[oó]scopo|signo|novela|bbb|big brother|loteria|mega-sena|resultado do jogo|palpite)\b/i;

export function isOffTopic(title: string): boolean {
  return offTopicTitle.test(title);
}

/** Pontuação usada para destacar assuntos de interesse do público brasileiro e anúncios oficiais. */
export function relevanceScore(input: { title: string; summary: string; language: "pt-BR" | "en"; sourceType: "editorial" | "official" }): number {
  const text = `${input.title} ${input.summary}`;
  let score = 1;
  if (input.language === "pt-BR") score += 2;
  if (brazilPattern.test(text)) score += 2;
  if (input.sourceType === "official") score += 2;
  if (topicPattern.test(text)) score += 1;
  return score;
}

const stopwords = new Set(("a o os as um uma uns umas de da do das dos e em no na nos nas por para com sem que se ao aos à às " +
  "mais menos como sobre seu sua seus suas ele ela eles elas isso este esta esse essa ser sao foi tem ter pode vai ja nao sim " +
  "the a an of to in on for with and or is are be by at from as its it new novo nova novos novas agora hoje veja saiba entenda").split(" "));

/** Palavras significativas do título, sem acentos e sem palavras vazias. Números (ex.: "5", "s26") contam. */
export function titleTokens(title: string): Set<string> {
  const words = title.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/[^a-z0-9]+/);
  return new Set(words.filter((word) => word && !stopwords.has(word) && (word.length >= 3 || /\d/.test(word))));
}

/**
 * Dois títulos tratam do mesmo anúncio quando compartilham a maior parte das palavras significativas.
 * Ex.: "OpenAI lança GPT-6 com raciocínio avançado" e "GPT-6: OpenAI anuncia modelo com raciocínio avançado".
 */
export function isSameStory(a: Set<string>, b: Set<string>): boolean {
  if (!a.size || !b.size) return false;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  const smaller = Math.min(a.size, b.size);
  const union = a.size + b.size - shared;
  if (shared === smaller && smaller >= 3) return true;
  return (shared >= 4 && shared / smaller >= 0.7) || (shared >= 3 && shared / union >= 0.6);
}
