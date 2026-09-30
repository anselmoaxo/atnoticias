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
- Coletor inicial: Tecnoblog, Tecmundo e The Verge. O último publica em inglês. Notícias com mais de sete dias ou sem descrição/data são ignoradas.
- Persistência no Neon por `@neondatabase/serverless`, migração SQL em `db/migrations/001_news_articles.sql` e comandos `npm run db:migrate` e `npm run news:import`.
- `/admin` exige sessão Neon Auth e corresponde ao único `ADMIN_EMAIL`; permite editar, arquivar e excluir notícias importadas. Não há cadastro público.
- GitHub Actions agenda a coleta a cada hora. É necessário cadastrar `DATABASE_URL` como secret do repositório GitHub para habilitar o job.
- Newsletter e envio de e-mails ainda não foram conectados; nenhum endereço é coletado nesta etapa.

## Configuração local

Copie `.env.example` para `.env.local`. Preencha `DATABASE_URL` com a URL pooled do Neon. `NEON_AUTH_BASE_URL` deve corresponder ao endpoint Neon Auth deste projeto; gere um `NEON_AUTH_COOKIE_SECRET` aleatório com pelo menos 32 caracteres; e defina `ADMIN_EMAIL` para o mesmo e-mail já cadastrado no Neon Auth. Esse será o único e-mail autorizado a entrar no painel. Não compartilhe nem versiona `.env.local`.

`CRON_SECRET` protege a rota alternativa `GET /api/cron/import-news` caso use um agendador HTTP externo. O workflow horário do GitHub executa o script diretamente e só precisa do secret de Actions `DATABASE_URL`. Para executar manualmente, use `npm run news:import`.

```powershell
Copy-Item .env.example .env.local
npm install
npm run db:migrate
npm run news:import
npm run dev
```

O primeiro e-mail/senha precisa existir no Neon Auth. A rota do portal não permite cadastro público. O importador usa os campos disponíveis no RSS e não copia o corpo integral da matéria.

## Newsletter (etapa posterior)

`RESEND_API_KEY` será usada somente quando o envio diário e o gerenciamento de cancelamento forem implementados. Ela não é necessária para importar notícias e permanece sem uso nesta etapa. `NEXT_PUBLIC_SITE_URL` deve receber o domínio de produção quando definido.
