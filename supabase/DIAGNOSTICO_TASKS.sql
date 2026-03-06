-- =============================================================================
-- DIAGNÓSTICO: tabela tasks (demandas que somem ao atualizar a página)
-- Rode cada bloco no SQL Editor do Supabase, um de cada vez.
-- =============================================================================

-- 1) Estrutura da tabela (colunas e tipos)
-- Confira se existe: id (uuid), designer_id (uuid), media_type, due_date (date ou timestamptz), created_at, value, etc.
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;

-- 2) RLS está ativo?
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname = 'tasks' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 3) Políticas atuais na tabela tasks
SELECT policyname, cmd, qual::text AS using_expr, with_check::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'tasks';

-- 4) Últimas 10 linhas (rodando como service role / postgres, sem RLS)
-- Se aparecerem linhas aqui mas não no app, o problema é RLS no SELECT do app.
SELECT id, designer_id, media_type, due_date, created_at, value
FROM public.tasks
ORDER BY created_at DESC
LIMIT 10;

-- 5) TESTE: desativar RLS temporariamente
-- Rode isto, depois atualize a página do app (F5). Se as demandas aparecerem, o bloqueio é RLS.
-- ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;

-- 6) Reativar RLS (depois do teste)
-- ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
