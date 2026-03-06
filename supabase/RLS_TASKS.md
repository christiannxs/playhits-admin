# Políticas RLS para a tabela `tasks` (Supabase)

## Por que as demandas somem ao atualizar a página?

O app **insere** a demanda com sucesso (por isso ela aparece na dashboard e no relatório na mesma sessão). Ao **atualizar a página**, os dados são carregados de novo com `SELECT * FROM tasks`. Se a tabela `tasks` tiver **Row Level Security (RLS)** ativado e não houver política que permita ao usuário logado **ler** as linhas que ele mesmo (ou outros) inseriram, o `SELECT` não devolve as demandas e elas “somem”.

Ou seja: o problema não é o INSERT, e sim o **SELECT** sendo filtrado pelas políticas RLS.

## O que fazer no Supabase

1. Acesse o **Supabase Dashboard** do seu projeto.
2. Vá em **SQL Editor** e execute o script abaixo (ajuste o nome da tabela se for diferente de `public.tasks`).

### Opção A: Usuários autenticados podem ver todas as demandas

Use esta opção se **qualquer usuário logado** (Diretor de Arte, Designer, Freelancer, etc.) pode ver todas as demandas.

```sql
-- Ativar RLS na tabela tasks (se ainda não estiver)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas que restrinjam SELECT (opcional; ajuste o nome se for diferente)
-- DROP POLICY IF EXISTS "nome_da_politica_antiga" ON public.tasks;

-- SELECT: qualquer usuário autenticado pode ver todas as demandas
CREATE POLICY "Authenticated users can view all tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (true);

-- INSERT: qualquer usuário autenticado pode criar demandas
CREATE POLICY "Authenticated users can insert tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: qualquer usuário autenticado pode atualizar qualquer demanda
CREATE POLICY "Authenticated users can update tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE: qualquer usuário autenticado pode deletar qualquer demanda
CREATE POLICY "Authenticated users can delete tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (true);
```

### Opção B: Restringir por perfil (designers só veem suas demandas)

Se no futuro você quiser que **designers** vejam só demandas em que `designer_id` seja o deles, e **Diretor de Arte** veja todas, você precisará de uma tabela de perfis (por exemplo `designers`) ligada ao `auth.uid()` e políticas que usem essa tabela. O app já usa a tabela `designers` com `auth_user_id`. Exemplo de política SELECT condicional:

```sql
-- Exemplo: usuário vê a demanda se for o designer da demanda OU se for diretor (checar role em designers)
CREATE POLICY "Users see own tasks or all if director"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  designer_id IN (SELECT id FROM public.designers WHERE auth_user_id = auth.uid())
  OR
  EXISTS (SELECT 1 FROM public.designers WHERE auth_user_id = auth.uid() AND role = 'Diretor de Arte')
);
```

Para INSERT/UPDATE/DELETE você pode criar políticas análogas usando `designers.auth_user_id` e `role`.

## Conferindo

- Depois de criar/ajustar as políticas, **faça logout e login** no app (ou abra em aba anônima) e **atualize a página** após adicionar uma demanda.
- Se a demanda continuar aparecendo após F5, as políticas de **SELECT** estão permitindo a leitura corretamente.

## Se ainda não funcionar: diagnóstico e teste sem RLS

1. **Confirme se a demanda está sendo gravada**  
   No Supabase: **Table Editor** → tabela **tasks**. Adicione uma demanda no app (sem dar F5). A nova linha aparece na tabela?  
   - Se **não** aparecer: o problema é no **INSERT** (estrutura da tabela, triggers, etc.).  
   - Se **aparecer**: o problema é no **SELECT** após F5 (RLS ou sessão).

2. **Teste desativando RLS (só para diagnóstico)**  
   No **SQL Editor**, rode:
   ```sql
   ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
   ```
   Atualize a página do app (F5). As demandas voltam a aparecer?  
   - Se **sim**: o bloqueio é do RLS. Remova políticas antigas e recrie as políticas da Opção A (veja abaixo).  
   - Se **não**: o problema é outro (sessão, rede, etc.).

3. **Ver políticas atuais na tabela**  
   ```sql
   SELECT policyname, cmd, qual, with_check
   FROM pg_policies
   WHERE tablename = 'tasks' AND schemaname = 'public';
   ```

4. **Remover todas as políticas e recriar (script único)**  
   Rode no SQL Editor o script da seção seguinte.

## Referência

- [Row Level Security (Supabase)](https://supabase.com/docs/guides/auth/row-level-security)
- [Troubleshooting RLS](https://supabase.com/docs/guides/troubleshooting/rls-simplified-BJTcS8)
