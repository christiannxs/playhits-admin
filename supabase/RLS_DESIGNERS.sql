-- =============================================================================
-- RLS para a tabela designers (perfis de usuários do painel)
-- Onde rodar: Supabase Dashboard → SQL Editor → colar e executar
-- =============================================================================
-- Se RLS estiver ativo sem políticas, o app não consegue:
-- - carregar o perfil no login (auth_user_id)
-- - listar designers, atualizar ou deletar
-- =============================================================================

-- Remover políticas antigas da tabela designers
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'designers') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.designers', r.policyname);
  END LOOP;
END $$;

-- Garantir que RLS está ativado
ALTER TABLE public.designers ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem ver todos os perfis (necessário para lista e para login buscar por auth_user_id)
CREATE POLICY "Authenticated users can view all designers"
ON public.designers FOR SELECT TO authenticated USING (true);

-- Apenas para inserção/atualização/exclusão: o app usa a Edge Function para criar;
-- o update e delete são feitos pelo cliente. Políticas permissivas para authenticated.
CREATE POLICY "Authenticated users can insert designers"
ON public.designers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update designers"
ON public.designers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete designers"
ON public.designers FOR DELETE TO authenticated USING (true);
