-- =============================================================================
-- LIMPAR TODAS AS DEMANDAS (ex.: vindas do Notion) e começar do zero
-- Onde rodar: Supabase Dashboard → SQL Editor → colar e executar
-- =============================================================================
-- ATENÇÃO: Isso apaga TODAS as linhas da tabela "tasks". Não há como desfazer.
-- Se quiser manter algumas demandas, não use este script; delete manualmente
-- no Table Editor ou crie um DELETE com filtro (ex.: WHERE created_at < '2025-01-01').
-- =============================================================================

-- Opção 1: Apagar todas as demandas (recomendado para zerar e recomeçar)
DELETE FROM public.tasks;

-- Opção 2 (alternativa): Se preferir TRUNCATE (mais rápido, reseta sequência de IDs se houver)
-- TRUNCATE TABLE public.tasks RESTART IDENTITY;

-- Depois de rodar: atualize a página do app (F5). A lista de demandas ficará vazia
-- e você passará a usar apenas as demandas criadas pelo próprio sistema.
