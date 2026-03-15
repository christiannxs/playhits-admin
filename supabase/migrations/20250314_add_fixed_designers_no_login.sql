-- Designers fixos sem login: apenas para atribuição de demandas e relatório.
-- Rafael Henrique (FIXO) e Marlon Bastos (FIXO DA PHD) não terão acesso ao painel.

-- Permitir auth_user_id nulo (designers que só aparecem em demandas/relatório)
ALTER TABLE public.designers
  ALTER COLUMN auth_user_id DROP NOT NULL;

-- Inserir os dois designers fixos (sem auth_user_id = sem login).
-- Só insere se o username ainda não existir para não duplicar em re-execução.
INSERT INTO public.designers (id, auth_user_id, name, username, role, type)
SELECT gen_random_uuid(), NULL, 'Rafael Henrique', 'rafael.henrique.fixo', 'Design Fixo', 'fixed'
WHERE NOT EXISTS (SELECT 1 FROM public.designers WHERE username = 'rafael.henrique.fixo');

INSERT INTO public.designers (id, auth_user_id, name, username, role, type)
SELECT gen_random_uuid(), NULL, 'Marlon Bastos', 'marlon.bastos.fixo', 'Design Fixo PHD', 'fixed'
WHERE NOT EXISTS (SELECT 1 FROM public.designers WHERE username = 'marlon.bastos.fixo');
