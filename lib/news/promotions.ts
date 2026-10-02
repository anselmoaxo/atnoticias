// Chamadas de divulgação que algumas fontes põem no meio do resumo (ex.: "📱 Veja as melhores promoções
// de hoje no WhatsApp do CT Ofertas"). Só casa frases que convidam o leitor a entrar, seguir ou ver algo em
// um canal da fonte, para não apagar notícias sobre o WhatsApp ou o Telegram.
const promotionPattern = /(?:[\u{1F4F1}\u{1F4F2}\u{1F449}\u{1F514}✅]️?\s*)?\b(?:[Vv]eja|[Cc]onfira|[Ss]iga|[Ee]ntre|[Pp]articipe|[Rr]eceba|[Aa]companhe|[Ii]nscreva-se)\b[^.!?\n]{0,90}?\b(?:no|pelo|em nosso|do nosso)\s+(?:canal\s+(?:do|no)\s+)?(?:[Ww]hats[Aa]pp|[Tt]elegram)\b(?:\s+d[oa]s?\s+\p{Lu}[\p{L}\d-]*(?:\s+\p{Lu}[\p{L}\d-]*)?(?=[\s.!?]|$))?[.!?]?/gu;

export function stripPromotions(value: string): string {
  return value.replace(promotionPattern, " ").replace(/\s+/g, " ").trim();
}
