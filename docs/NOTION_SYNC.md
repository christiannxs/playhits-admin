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

## 2. Integração do Notion

1. Acesse [Notion Integrations](https://www.notion.so/my-integrations) e crie uma integração.
2. Copie o **Internal Integration Secret** (token).
3. No Notion, abra o **database** que será a fonte das demandas → menu **•••** → **Add connections** → selecione a integração criada.

## 3. ID do database

- Abra o database no Notion no navegador.
- A URL é algo como:  
  `https://www.notion.so/workspace/NOME-DO-DATABASE?id=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`  
- O **id** (a parte depois de `id=`) é o **NOTION_DATABASE_ID**. Use o ID **sem hífens** na API (ou com hífens, conforme a documentação do Notion).

## 4. Supabase: migration e secrets

1. **Migration** (coluna para evitar duplicatas):

   Rode a migration que adiciona `notion_page_id` em `tasks`:

   ```bash
   supabase db push
   # ou execute manualmente: supabase/migrations/20250314_add_notion_page_id_to_tasks.sql
   ```

2. **Secrets da Edge Function**:

   No dashboard do Supabase → **Edge Functions** → **sync-notion** → **Secrets** (ou via CLI):

   ```bash
   supabase secrets set NOTION_API_KEY="seu_token_da_integracao_notion"
   supabase secrets set NOTION_DATABASE_ID="id_do_database_sem_hifens"
   ```

   Opcionais (se os nomes das propriedades no Notion forem diferentes):

   ```bash
   supabase secrets set NOTION_PROP_DESIGNER="Designer"
   supabase secrets set NOTION_PROP_MEDIA_TYPE="Tipo de mídia"
   supabase secrets set NOTION_PROP_DUE="Data de entrega"
   supabase secrets set NOTION_PROP_ARTIST="Artista"
   supabase secrets set NOTION_PROP_SOCIAL="Rede social"
   supabase secrets set NOTION_PROP_DESCRIPTION="Descrição"
   ```

3. **Deploy da Edge Function**:

   ```bash
   supabase functions deploy sync-notion
   ```

## 5. Sincronização automática

- **No app**: ao abrir a tela **Demandas** (como Diretor de Arte), a sincronização é disparada **uma vez**; depois há um cooldown de **5 minutos** antes de rodar de novo automaticamente. O botão **"Sincronizar com Notion"** sempre pode ser clicado para forçar uma nova sincronização.
- **Por cron (opcional)**: para rodar a sync em horários fixos (ex.: a cada hora), use o **Supabase Cron** ou um serviço externo (ex.: cron-job.org) chamando a URL da Edge Function com um secret no header (evite expor a URL publicamente sem autenticação).

## Resumo

1. Database no Notion com colunas Designer, Tipo de mídia, Data de entrega (e opcionais).
2. Integração Notion criada e database compartilhado com ela.
3. Migration aplicada no Supabase (`notion_page_id` em `tasks`).
4. Secrets `NOTION_API_KEY` e `NOTION_DATABASE_ID` na Edge Function.
5. Deploy da função `sync-notion`.

Depois disso, use **"Sincronizar com Notion"** na tela de Demandas ou deixe o app puxar sozinho ao abrir a tela (respeitando o cooldown de 5 min).
