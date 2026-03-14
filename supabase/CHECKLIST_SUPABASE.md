# Checklist: o que precisa existir no Supabase

> **Atenção:** Este arquivo é **documentação (Markdown)**. **Não cole este conteúdo no SQL Editor do Supabase.** Os scripts que devem ser executados no SQL Editor são os arquivos `.sql` desta pasta (`RLS_DESIGNERS.sql`, `RLS_ADVANCES.sql`, `TASKS_RLS_FIX.sql`, etc.).

Use este checklist para garantir que o projeto **playhits-admin** funcione corretamente no Supabase.

---

## 1. Tabelas

O app usa três tabelas em `public`:

| Tabela      | Uso no app |
|------------|------------|
| **designers** | Perfis de usuários (nome, username, role, auth_user_id). Login busca perfil por `auth_user_id`. |
| **tasks**     | Demandas (designer_id, media_type, due_date, value, approval_status, etc.). |
| **advances**  | Adiantamentos por designer (designer_id, amount, date, description). |

- Se as tabelas já existem (criadas manualmente ou por outro projeto), confira se têm as colunas esperadas (veja `types.ts` no projeto).
- A coluna **approval_status** em `tasks` pode ser adicionada com a migration:  
  `supabase/migrations/20250313_add_approval_status_to_tasks.sql`

---

## 2. Row Level Security (RLS)

Se RLS estiver **ativado** em alguma tabela sem políticas, o app não consegue ler/gravar. Execute os scripts abaixo no **SQL Editor** do Supabase:

| Arquivo | Tabela    | Quando rodar |
|---------|-----------|--------------|
| `TASKS_RLS_FIX.sql`   | tasks     | Demandas somem após F5 ou erros de permissão em tasks. |
| **RLS_DESIGNERS.sql** | designers | Erro ao carregar lista de designers, ao editar/remover designer ou ao fazer login (perfil não encontrado). |
| **RLS_ADVANCES.sql**  | advances  | Erro ao listar, adicionar ou excluir adiantamentos. |

Ordem sugerida: rodar os três (tasks já pode estar feito).

---

## 3. Edge Function

O app chama a função **`create-user-and-profile`** ao cadastrar um novo designer (cria usuário no Auth + linha em `designers`).

- **Onde:** Supabase Dashboard → Edge Functions.
- Se a função não existir, o botão "Adicionar designer" falha com erro de servidor/timeout.
- O código dessa função **não está neste repositório**; ela precisa estar implementada e publicada no seu projeto Supabase (ou em outro repositório que você usa para deploy das functions).

---

## 4. Autenticação (Auth)

- Login usa **email** no formato `{username}@playhits.local` e **senha**.
- Em **Authentication → Providers → Email**: deixe habilitado; se quiser evitar confirmação de e-mail para esse domínio, ajuste em **Auth Settings** (por exemplo, desabilitar "Confirm email" ou usar allowlist).
- Usuários são criados pela Edge Function `create-user-and-profile` (não há tela de registro no app).

---

## 5. Resumo rápido

| Item            | Onde verificar / O que fazer |
|-----------------|------------------------------|
| Tabelas existem | Table Editor: `designers`, `tasks`, `advances`. |
| Coluna approval_status | Em `tasks`. Se faltar, rodar `migrations/20250313_add_approval_status_to_tasks.sql`. |
| RLS tasks       | Rodar `TASKS_RLS_FIX.sql` se demandas sumirem ou der erro de permissão. |
| RLS designers   | Rodar `RLS_DESIGNERS.sql` se login falhar (perfil não encontrado) ou CRUD de designers falhar. |
| RLS advances    | Rodar `RLS_ADVANCES.sql` se adiantamentos não carregarem ou der erro ao adicionar/remover. |
| Edge Function   | `create-user-and-profile` deve existir e estar deployada. |
| Auth            | Provider Email habilitado; domínio @playhits.local permitido se necessário. |

Depois de aplicar os scripts RLS, faça **logout e login** no app e teste novamente.
