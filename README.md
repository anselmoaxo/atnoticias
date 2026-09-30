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

- Página inicial responsiva, categorias, busca, página de privacidade e metadados em português.
- Convite acessível para newsletter, validação no navegador e lembrança local por sete dias quando fechado ou recusado.
- Painel editorial em `/admin` para experimentar rascunhos, edição, publicação e arquivamento durante a sessão atual.
- Não há notícias de exemplo, login, API, persistência, inscrição ou envio de e-mail. O painel não é protegido e não deve receber conteúdo real.

## Integrações futuras

Não há variáveis de ambiente necessárias para executar a demonstração. Para transformar o painel e a newsletter em serviços reais, será necessário implementar API e configurar credenciais no ambiente de servidor (nunca no navegador):

- `DATABASE_URL` com a URL de conexão do Neon, configurada apenas no servidor. Para produção serverless, prefira a URL com pooler fornecida pelo Neon.
- `RESEND_API_KEY` exclusivamente no servidor para envio de e-mail; domínio remetente verificado também será necessário.
- `NEXT_PUBLIC_SITE_URL` com o domínio real para metadados canônicos e links de produção.

Os nomes acima documentam uma integração futura; este repositório ainda não os lê nem conecta Neon ou Resend. A demonstração não acessa o banco. Antes de coletar dados, implementar autenticação e autorização no servidor, persistência com controles de acesso, validação e limitação de abuso, cancelamento de inscrição e uma política de privacidade compatível.
