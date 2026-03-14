-- =============================================================================
-- RLS para a tabela advances (adiantamentos por designer)
-- Onde rodar: Supabase Dashboard → SQL Editor → colar e executar
-- =============================================================================
-- Se RLS estiver ativo sem políticas, o app não consegue listar, adicionar ou excluir adiantamentos.
-- =============================================================================

-- Remover políticas antigas da tabela advances
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'advances') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.advances', r.policyname);
  END LOOP;
END $$;

-- Garantir que RLS está ativado
ALTER TABLE public.advances ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem ver todos os adiantamentos
CREATE POLICY "Authenticated users can view all advances"
ON public.advances FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert advances"
ON public.advances FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update advances"
ON public.advances FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete advances"
ON public.advances FOR DELETE TO authenticated USING (true);
