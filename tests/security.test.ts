import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { isAuthorizedAdmin } from "@/lib/admin";
import { isAllowedAuthEndpoint } from "@/lib/auth/endpoints";
import { escapeHtml } from "@/lib/html";
import { cleanText } from "@/lib/news/importer";
import { readSecret } from "@/lib/secrets";

const originalEnv = { ...process.env };
afterEach(() => { process.env = { ...originalEnv }; });

describe("isAuthorizedAdmin", () => {
  it("recusa sessão só com o e-mail igual, sem verificação", () => {
    process.env.ADMIN_EMAIL = "admin@exemplo.com";
    delete process.env.ADMIN_USER_ID;
    assert.equal(isAuthorizedAdmin({ id: "u1", email: "admin@exemplo.com", emailVerified: false }), false);
    assert.equal(isAuthorizedAdmin({ id: "u1", email: "Admin@Exemplo.com", emailVerified: true }), true);
  });

  it("com ADMIN_USER_ID, só aceita aquela conta", () => {
    process.env.ADMIN_EMAIL = "admin@exemplo.com";
    process.env.ADMIN_USER_ID = "u1";
    assert.equal(isAuthorizedAdmin({ id: "u2", email: "admin@exemplo.com", emailVerified: true }), false);
    assert.equal(isAuthorizedAdmin({ id: "u1", email: "admin@exemplo.com", emailVerified: false }), true);
  });

  it("falha fechado sem ADMIN_EMAIL ou com outro e-mail", () => {
    delete process.env.ADMIN_EMAIL;
    assert.equal(isAuthorizedAdmin({ id: "u1", email: "admin@exemplo.com", emailVerified: true }), false);
    process.env.ADMIN_EMAIL = "admin@exemplo.com";
    assert.equal(isAuthorizedAdmin({ id: "u1", email: "outro@exemplo.com", emailVerified: true }), false);
  });
});

describe("proxy do Neon Auth", () => {
  it("libera só consulta e encerramento de sessão", () => {
    assert.equal(isAllowedAuthEndpoint("GET", ["get-session"]), true);
    assert.equal(isAllowedAuthEndpoint("POST", ["sign-out"]), true);
    for (const [method, path] of [["POST", "sign-up/email"], ["POST", "sign-in/social"], ["POST", "sign-in/magic-link"],
      ["POST", "change-email"], ["POST", "update-user"], ["POST", "get-session"], ["GET", "sign-up/email"]]) {
      assert.equal(isAllowedAuthEndpoint(method, path.split("/")), false, `${method} ${path}`);
    }
  });
});

describe("cleanText", () => {
  it("não deixa HTML codificado virar tag", () => {
    const result = cleanText("Título &lt;img src=x onerror=alert(1)&gt; final");
    assert.ok(!/[<>]/.test(result), result);
    assert.equal(cleanText("&lt;script&gt;alert(1)&lt;/script&gt;Notícia"), "Notícia");
  });

  it("remove tags quebradas e preserva texto comum", () => {
    assert.ok(!/[<>]/.test(cleanText("Oferta <img src=x onerror=alert(1) ")));
    assert.equal(cleanText("<p>Apple &amp; Google lançam <b>novidades</b></p>"), "Apple & Google lançam novidades");
    assert.equal(cleanText("&amp;lt;b&amp;gt;"), "&lt;b&gt;");
  });
});

describe("segredos", () => {
  it("ignora segredo com menos de 32 caracteres", () => {
    process.env.CRON_SECRET = "abc";
    assert.equal(readSecret("CRON_SECRET"), null);
    process.env.CRON_SECRET = "x".repeat(32);
    assert.equal(readSecret("CRON_SECRET"), "x".repeat(32));
  });

  it("usa o primeiro nome configurado, sem cair em outros segredos", () => {
    delete process.env.RATE_LIMIT_SECRET;
    process.env.NEWSLETTER_RATE_LIMIT_SECRET = "y".repeat(40);
    assert.equal(readSecret("RATE_LIMIT_SECRET", "NEWSLETTER_RATE_LIMIT_SECRET"), "y".repeat(40));
    delete process.env.NEWSLETTER_RATE_LIMIT_SECRET;
    process.env.DATABASE_URL = "postgres://" + "z".repeat(40);
    assert.equal(readSecret("RATE_LIMIT_SECRET", "NEWSLETTER_RATE_LIMIT_SECRET"), null);
  });
});

describe("escapeHtml", () => {
  it("escapa caracteres especiais de HTML", () => {
    assert.equal(escapeHtml(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});
