# Sincronização de demandas com o Notion

O app pode **puxar demandas automaticamente** de um database do Notion para a tabela **tasks** do Supabase.

## Como funciona

- **Diretor de Arte**: na tela de Demandas aparece o botão **"Sincronizar com Notion"**. Ao clicar (ou ao abrir a tela, uma vez a cada 5 minutos), o app chama a Edge Function `sync-notion`, que lê o database no Notion e insere apenas demandas **novas** (evitando duplicatas pelo ID da página no Notion).
- **Mapeamento**: a função espera propriedades no database do Notion com nomes padrão. Se o seu database usar outros nomes, configure as variáveis de ambiente na Edge Function.

## 1. Database no Notion

Crie um database no Notion (ou use um existente) com pelo menos estas colunas:

| Nome sugerido no Notion | Tipo   | Uso no app                          |
|-------------------------|--------|-------------------------------------|
| **Designer**            | Texto  | Nome do designer (igual ao cadastro) |
| **Tipo de mídia**       | Select | Ex.: Motion, Flyer, Teaser, Outros |
| **Data de entrega**     | Data   | YYYY-MM-DD                          |
| **Artista**             | Texto  | opcional                            |
| **Rede social**         | Texto  | opcional                            |
| **Descrição**           | Texto  | opcional                            |

- O valor **Designer** deve ser **exatamente** o nome do designer cadastrado no app (tabela `designers`). A função associa pelo nome para obter o `designer_id`.
- **Tipo de mídia** deve coincidir com os tipos do app (Motion, Teaser, Flyer, Catálogo/Carrossel, Outros, Criação de ID, Ônibus, Plantão Final de Semana). Se não bater, a demanda é importada como "Outros".
- **Valores (pagamento):** no Notion não existem valores por demanda. Na sincronização, o app atribui o valor de cada demanda pelo **tipo de mídia** (tabela de preços no app). Para pagar por designer de acordo com as demandas, use em **Relatórios** a seção **"Pagamento por designer"**: escolha o período, veja as demandas separadas por designer com valor de cada uma e o total a pagar; use **"Copiar relatório"** para levar os valores ao pagamento.

## 2. Integração do Notion

1. Acesse [Notion Integrations](https://www.notion.so/my-integrations) e crie uma integração.
2. Copie o **Internal Integration Secret** (token).
3. No Notion, abra o **database** que será a fonte das demandas → menu **•••** → **Add connections** → selecione a integração criada.

## 3. ID do database

- Abra o database no Notion no navegador.
- A URL é algo como:  
  `https://www.notion.so/workspace/NOME-DO-DATABASE?id=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`  
- O **id** (a parte depois de `id=`) é o **NOTION_DATABASE_ID**. Use o ID **sem hífens** na API (ou com hífens, conforme a documentação do Notion).

## 4. Supabase: migration

Rode a migration que adiciona `notion_page_id` em `tasks` (no Supabase SQL Editor ou via `supabase db push`):

- Arquivo: `supabase/migrations/20250314_add_notion_page_id_to_tasks.sql`

---

## Opção A — Manual (recomendado): rota de API no Vercel

Sem Docker nem Supabase CLI. O projeto já inclui a rota **`api/sync-notion.ts`**. Basta fazer deploy do app na Vercel e configurar as variáveis de ambiente.

### Passos

1. **Deploy na Vercel**
   - Conecte o repositório em [vercel.com](https://vercel.com) e faça o deploy (ou `vercel` no terminal).
   - A pasta `api/` vira uma função serverless em **`/api/sync-notion`**.

2. **Variáveis de ambiente no painel da Vercel**
   - Projeto → **Settings** → **Environment Variables**. Adicione:

   | Nome                         | Valor                                                                 | Observação |
   |-----------------------------|-----------------------------------------------------------------------|------------|
   | `NOTION_API_KEY`            | Token da integração do Notion                                         | Obrigatório |
   | `NOTION_DATABASE_ID`        | ID do database (ex.: `29d71419772880b1872fcf285aeff5bb`)              | Obrigatório |
   | `SUPABASE_URL`              | `https://kkoeclshogsufckkpqjj.supabase.co` (sua URL do projeto)       | Obrigatório |
   | `SUPABASE_SERVICE_ROLE_KEY` | Chave **service_role** do Supabase (não a anon)                       | Obrigatório |

   - Para obter a **service_role**: Supabase Dashboard → **Project Settings** → **API** → em "Project API keys" copie a chave **service_role** (secret). Não use em front-end; só na API serverless.

3. **Redeploy**
   - Depois de salvar as variáveis, faça um novo deploy (Redeploy no último deployment ou push no Git).

4. **Testar**
   - Abra o app na URL da Vercel → **Demandas** → **Sincronizar com Notion**.

O app chama primeiro `/api/sync-notion` (mesma origem). Se estiver no ar na Vercel com as env vars certas, a sincronização funciona sem Edge Function.

---

## Desenvolvimento local (localhost)

No **localhost** o Vite não expõe a rota `/api/sync-notion` (essa rota existe só no deploy na Vercel). O app tenta essa rota primeiro; se falhar, tenta chamar a Edge Function direto do navegador — e isso pode gerar o erro *"Failed to send a request to the Edge Function"* (CORS/rede).

Para o **"Sincronizar com Notion"** funcionar em desenvolvimento local, o Vite está configurado para fazer **proxy** de `POST /api/sync-notion` para a Edge Function do Supabase. Basta ter no seu `.env` (na raiz do projeto):

| Variável | Descrição |
|----------|-----------|
| `SUPABASE_URL` | URL do projeto (ex.: `https://kkoeclshogsufckkpqjj.supabase.co`) |
| `SUPABASE_ANON_KEY` | Chave **anon/public** do Supabase (Project Settings → API) |

Assim, ao clicar em "Sincronizar com Notion" no localhost, o request vai para o servidor do Vite e é repassado à Edge Function, evitando o erro. Reinicie o `npm run dev` depois de criar ou alterar o `.env`.

---

## Opção B — Edge Function no Supabase (exige Docker + CLI)

1. **Secrets da Edge Function** (Dashboard do Supabase ou CLI):

   ```bash
   supabase secrets set NOTION_API_KEY="seu_token_da_integracao_notion"
   supabase secrets set NOTION_DATABASE_ID="id_do_database_sem_hifens"
   ```

   Opcionais (nomes das propriedades no Notion diferentes do padrão):

   ```bash
   supabase secrets set NOTION_PROP_DESIGNER="Designer"
   supabase secrets set NOTION_PROP_MEDIA_TYPE="Tipo de mídia"
   supabase secrets set NOTION_PROP_DUE="Data de entrega"
   supabase secrets set NOTION_PROP_ARTIST="Artista"
   supabase secrets set NOTION_PROP_SOCIAL="Rede social"
   supabase secrets set NOTION_PROP_DESCRIPTION="Descrição"
   ```

2. **Deploy da Edge Function** (Docker precisa estar rodando):

   ```bash
   supabase functions deploy sync-notion
   ```

   Se a função `sync-notion` não estiver deployada, o app tenta a rota `/api/sync-notion` (útil quando o app está na Vercel).

## 5. Sincronização automática

- **No app**: ao abrir a tela **Demandas** (como Diretor de Arte), a sincronização é disparada **uma vez**; depois há um cooldown de **5 minutos** antes de rodar de novo automaticamente. O botão **"Sincronizar com Notion"** sempre pode ser clicado para forçar uma nova sincronização.
- **Por cron (opcional)**: para rodar a sync em horários fixos (ex.: a cada hora), use o **Supabase Cron** ou um serviço externo (ex.: cron-job.org) chamando a URL da Edge Function com um secret no header (evite expor a URL publicamente sem autenticação).

## Resumo

1. Database no Notion com colunas Designer, Tipo de mídia, Data de entrega (e opcionais).
2. Integração Notion criada e database compartilhado com ela.
3. Migration aplicada no Supabase (`notion_page_id` em `tasks`).
4. **Manual (recomendado):** Deploy do app na Vercel e variáveis `NOTION_API_KEY`, `NOTION_DATABASE_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` no painel da Vercel.  
   **Ou** deploy da Edge Function no Supabase (Docker + `supabase functions deploy sync-notion`).

Depois disso, use **"Sincronizar com Notion"** na tela de Demandas ou deixe o app puxar sozinho ao abrir a tela (respeitando o cooldown de 5 min).
