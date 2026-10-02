import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stripPromotions } from "@/lib/news/promotions";

describe("stripPromotions", () => {
  it("remove a chamada de ofertas no WhatsApp do meio do resumo", () => {
    assert.equal(
      stripPromotions("O aparelho terá 3,9 mm aberto. 📱 Veja as melhores promoções de hoje no WhatsApp do CT Ofertas Os números representam uma redução."),
      "O aparelho terá 3,9 mm aberto. Os números representam uma redução.",
    );
  });

  it("remove convites para seguir canais", () => {
    assert.equal(stripPromotions("Resumo da matéria. Siga o Tecmundo no Telegram."), "Resumo da matéria.");
  });

  it("mantém notícias sobre o WhatsApp", () => {
    const text = "O WhatsApp vai liberar edição de mensagens no Brasil. Veja como usar o recurso no aplicativo.";
    assert.equal(stripPromotions(text), text);
  });
});
