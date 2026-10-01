-- Papéis com o mínimo de privilégio. Não é uma migração: rode uma vez, com o papel dono do banco
-- (ex.: neondb_owner), depois de criar os dois papéis no painel do Neon (Roles > New role), que gera as senhas.
--
--   atn_app       runtime do site na Vercel (DATABASE_URL)
--   atn_importer  job horário do GitHub Actions (secret DATABASE_URL_IMPORTER)
--
-- O papel dono continua sendo usado só por `npm run db:migrate` (DATABASE_MIGRATION_URL).
-- Rode de novo sempre que uma migração criar tabela nova.

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO atn_app, atn_importer;

-- Site: lê e edita notícias, gerencia inscritos e limites. Sem DDL.
GRANT SELECT, INSERT, UPDATE, DELETE ON news_articles, newsletter_subscribers, newsletter_signup_limits, rate_limits TO atn_app;
GRANT SELECT, INSERT, UPDATE ON news_import_runs TO atn_app;

-- Importador: só grava notícias novas e o registro da execução. Nenhum acesso aos inscritos.
GRANT SELECT, INSERT ON news_articles TO atn_importer;
GRANT SELECT, INSERT, UPDATE ON news_import_runs TO atn_importer;
REVOKE ALL ON newsletter_subscribers, newsletter_signup_limits, rate_limits FROM atn_importer;
