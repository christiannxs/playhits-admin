-- Coluna para evitar duplicatas ao sincronizar demandas do Notion.
-- Cada página do Notion tem um id único; ao importar, gravamos aqui e só importamos de novo se não existir.

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS notion_page_id text;

COMMENT ON COLUMN tasks.notion_page_id IS 'ID da página no Notion (para sync); evita criar demanda duplicada na re-sincronização.';

CREATE INDEX IF NOT EXISTS idx_tasks_notion_page_id ON tasks (notion_page_id) WHERE notion_page_id IS NOT NULL;
