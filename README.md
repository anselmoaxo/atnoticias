# Anselmo Tech Notícias

Portal demonstrativo de notícias sobre tecnologia, criado com Next.js App Router, React e TypeScript.

## Executar localmente

Requer Node.js 20.9 ou mais recente.

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Para gerar e executar a versão de produção, use `npm run build` e depois `npm start`.

## O que está implementado

- Página inicial responsiva, categorias, busca, páginas de leitura com links para as fontes e metadados em português.
- Importação RSS sem geração por IA: o portal salva os títulos e as descrições fornecidos pelos feeds, com fonte e data originais, e evita duplicatas.
- Coletor inicial: Tecnoblog e Canaltech, ambos em português do Brasil. Notícias com mais de sete dias ou sem descrição/data são ignoradas. A categoria vem dos marcadores do feed e de termos do título/descrição; quando não há sinal suficiente, usa a categoria geral “Tecnologia”.
- Persistência no Neon por `@neondatabase/serverless`; as migrações SQL em `db/migrations/` são aplicadas por `npm run db:migrate`. Use `npm run news:import` para importar feeds, `npm run news:reclassify` para ajustar matérias importadas que ainda não foram editadas no painel e `npm run news:sanitize` para reaplicar a limpeza de texto às notícias já gravadas. Título, resumo e autor são sempre texto puro, sem `<` nem `>`; escape-os com `escapeHtml` (`lib/html.ts`) ao montar qualquer HTML, como e-mails.
- `/admin` exige sessão Neon Auth do único `ADMIN_EMAIL`, que também precisa ser a conta de `ADMIN_USER_ID` (recomendado) ou ter o e-mail verificado; permite editar, arquivar e excluir notícias importadas. O login tem limite de 10 tentativas por endereço de rede a cada 15 minutos. Não há cadastro público: desative o cadastro também no painel do Neon Auth, porque o proxy `/api/auth` só libera `get-session` e `sign-out`, mas o endpoint do Neon Auth pode ser chamado direto.
- GitHub Actions agenda a coleta a cada hora. Cadastre o secret `DATABASE_URL_IMPORTER` com o papel `atn_importer` (veja “Papéis do banco”); enquanto ele não existir, o job usa `DATABASE_URL` e mostra um aviso.
- A inscrição na newsletter salva no Neon apenas e-mails informados com consentimento explícito. O envio de campanhas continua desligado; o painel permite consultar, cancelar, reativar, excluir e exportar a lista.

## Configuração local

Copie `.env.example` para `.env.local`. Preencha `DATABASE_URL` com a URL pooled do Neon. `NEON_AUTH_BASE_URL` deve corresponder ao endpoint Neon Auth deste projeto; gere um `NEON_AUTH_COOKIE_SECRET` aleatório com pelo menos 32 caracteres; e defina `ADMIN_EMAIL` para o mesmo e-mail já cadastrado no Neon Auth. Esse será o único e-mail autorizado a entrar no painel. Não compartilhe nem versiona `.env.local`.

`CRON_SECRET` (mínimo 32 caracteres, ex.: `openssl rand -hex 32`) protege a rota alternativa `GET /api/cron/import-news` caso use um agendador HTTP externo; valores mais curtos deixam a rota fechada. `RATE_LIMIT_SECRET` (mínimo 32 caracteres) é obrigatório para a newsletter e alimenta os limites de tentativas; o nome antigo `NEWSLETTER_RATE_LIMIT_SECRET` ainda é aceito. O workflow horário do GitHub executa o script diretamente. Para executar manualmente, use `npm run news:import`.

```powershell
Copy-Item .env.example .env.local
npm install
npm run db:migrate
npm run news:import
npm run dev
```

O primeiro e-mail/senha precisa existir no Neon Auth. A rota do portal não permite cadastro público. O importador usa os campos disponíveis no RSS e não copia o corpo integral da matéria.

## Papéis do banco

A aplicação, o importador e as migrações usam papéis diferentes. No painel do Neon, crie os papéis `atn_app` e `atn_importer` e rode `db/roles.sql` com o papel dono (por exemplo, `neondb_owner`). Depois use a URL de `atn_app` em `DATABASE_URL` (Vercel), a de `atn_importer` no secret `DATABASE_URL_IMPORTER` do GitHub Actions e a do papel dono só em `DATABASE_MIGRATION_URL`, para `npm run db:migrate`. Rode `db/roles.sql` de novo sempre que uma migração criar tabela.

## Segurança

`proxy.ts` envia uma Content-Security-Policy com nonce por requisição; os demais cabeçalhos (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, HSTS) ficam em `next.config.ts`. Imagens de feeds só são aceitas em https. Rode `npm test` para os testes de segurança.

## Newsletter

O formulário valida o e-mail e grava a inscrição no Neon (`newsletter_subscribers`) como `pending`. Para um endereço já cadastrado, o pedido só renova o link: status, data de consentimento e cancelamento mudam apenas quando o dono do e-mail confirma. Em seguida envia pelo Resend um e-mail de confirmação com link de uso único, válido por 48 horas; a página `/newsletter/confirmar` ativa a inscrição quando a pessoa clica em “Confirmar”. Um limite de tentativas por endereço de rede, armazenado como hash temporário, e um intervalo de 2 minutos entre reenvios para o mesmo e-mail ajudam a reduzir abusos. O envio das campanhas e os links de cancelamento nos e-mails ainda não estão ativos. Configure `RESEND_API_KEY` e `NEWSLETTER_FROM_EMAIL` (remetente em domínio verificado no Resend) no ambiente do servidor e aplique as migrações com `npm run db:migrate`. `NEXT_PUBLIC_SITE_URL` deve receber o domínio de produção, pois ele monta o link de confirmação.
