-- =============================================================================
-- SCRIPT: Corrigir RLS da tabela tasks (demandas somem ao atualizar a página)
-- Onde rodar: Supabase Dashboard → SQL Editor → colar e executar
-- =============================================================================

-- 1) Ver o que existe hoje (só consulta; não altera nada)
-- Descomente a linha abaixo, rode, e confira as políticas listadas:
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks';

-- 2) Remover TODAS as políticas da tabela tasks (evita conflito com políticas antigas)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tasks', r.policyname);
  END LOOP;
END $$;

-- 3) Garantir que RLS está ativado
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 4) Criar políticas que permitem usuários autenticados a ver e editar todas as demandas
CREATE POLICY "Authenticated users can view all tasks"
ON public.tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert tasks"
ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update tasks"
ON public.tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tasks"
ON public.tasks FOR DELETE TO authenticated USING (true);

-- Pronto. Faça um novo login no app, adicione uma demanda e atualize a página (F5).
