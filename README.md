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
- Persistência no Neon por `@neondatabase/serverless`; as migrações SQL em `db/migrations/` são aplicadas por `npm run db:migrate`. Use `npm run news:import` para importar feeds e `npm run news:reclassify` para ajustar matérias importadas que ainda não foram editadas no painel.
- `/admin` exige sessão Neon Auth e corresponde ao único `ADMIN_EMAIL`; permite editar, arquivar e excluir notícias importadas. Não há cadastro público.
- GitHub Actions agenda a coleta a cada hora. É necessário cadastrar `DATABASE_URL` como secret do repositório GitHub para habilitar o job.
- A inscrição na newsletter salva no Neon apenas e-mails informados com consentimento explícito. O envio de campanhas continua desligado; o painel permite consultar, cancelar, reativar, excluir e exportar a lista.

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

## Newsletter

O formulário valida o e-mail e grava a inscrição no Neon (`newsletter_subscribers`) como `pending`. Em seguida envia pelo Resend um e-mail de confirmação com link de uso único, válido por 48 horas; a página `/newsletter/confirmar` ativa a inscrição quando a pessoa clica em “Confirmar”. Um limite de tentativas por endereço de rede, armazenado como hash temporário, e um intervalo de 2 minutos entre reenvios para o mesmo e-mail ajudam a reduzir abusos. O envio das campanhas e os links de cancelamento nos e-mails ainda não estão ativos. Configure `RESEND_API_KEY` e `NEWSLETTER_FROM_EMAIL` (remetente em domínio verificado no Resend) no ambiente do servidor e aplique a migração `003` com `npm run db:migrate`. `NEXT_PUBLIC_SITE_URL` deve receber o domínio de produção, pois ele monta o link de confirmação.
