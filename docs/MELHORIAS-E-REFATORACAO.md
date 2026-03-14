# Refatoração e melhorias de interface

## O que foi feito

### Refatoração

1. **`utils/formatApiError.ts`**  
   Centralização da formatação de erros do Supabase/API (`formatDbError`, `formatNetworkError`) para evitar código duplicado no App e mensagens consistentes.

2. **`components/ConfigurationErrorView.tsx`**  
   Tela de erro de configuração do Supabase extraída do `App.tsx` para um componente próprio.

3. **`hooks/useAppData.ts`**  
   Toda a lógica de estado e handlers (sessão, designers, tasks, advances, CRUD) foi movida para o hook `useAppData`. O `App.tsx` passou a apenas:
   - Verificar configuração do Supabase
   - Usar o hook
   - Controlar view ativa e permissões
   - Renderizar Header + conteúdo + footer

4. **`App.tsx`**  
   Reduzido e focado em composição: uso do hook, roteamento por view e exibição do banner de erro global. Título da view no `ViewErrorBoundary` passou a usar um mapa `viewNames`.

5. **Banner de erro global**  
   Ajuste de acessibilidade (`role="alert"`) e layout (título + botão fechar alinhados, texto em `pre` com overflow).

6. **`components/Modal.tsx`**  
   - Fechar com tecla **Escape**
   - Bloqueio de scroll do body enquanto o modal está aberto
   - Foco no primeiro elemento focável ao abrir
   - Atributos de acessibilidade: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-label` no botão fechar

7. **`components/EmptyState.tsx`**  
   Componente reutilizável para telas vazias (ícone opcional, título e descrição), com `role="status"` e `aria-label`.

---

## Melhorias de interface sugeridas (próximos passos)

### Acessibilidade

- Revisar ordem de tabulação em formulários (Demandas, Designers, Relatórios).
- Garantir que mensagens de erro de validação estejam associadas aos campos via `aria-describedby` ou `id` no erro + `aria-describedby` no input.
- Em tabelas (Demandas, Relatórios), considerar `scope="col"` nos `<th>` e resumos com `aria-describedby` no `<table>`.

### Feedback e UX

- **Toasts/notificações**: Em vez de (ou além de) só o banner de erro no topo, usar toasts para sucesso (ex.: “Demanda adicionada”, “Designer criado”) e erros leves, deixando o banner para erros críticos.
- **Confirmações**: Trocar `window.confirm` por modais de confirmação (ex.: “Excluir demanda?”, “Remover designer?”) para manter o mesmo padrão visual do app.
- **Loading em ações**: Botões que disparam ações assíncronas (Salvar, Adicionar, etc.) podem mostrar estado de loading (spinner + “Salvando...”) de forma consistente em todos os formulários.

### Formulários

- **Classes de input**: Extrair a classe repetida dos inputs/selects (ex.: `input-base` ou componente `Input`) para um único lugar e reutilizar em LoginView, TasksView, DesignersView, ReportsView.
- **Validação**: Exibir erros de validação inline (por campo) nos formulários de demanda e designer, além da mensagem geral.

### Navegação e layout

- **Mobile**: No Header, em telas pequenas, considerar menu hamburger ou drawer para a navegação, em vez de vários itens em linha.
- **Breadcrumb**: Em telas com contexto (ex.: Relatórios por período), um breadcrumb ou indicador de “onde estou” pode ajudar.

### Performance e dados

- **Paginação ou virtualização**: Se a lista de demandas ou de designers crescer muito, considerar paginação ou virtualização da tabela/lista.
- **Filtros em Relatórios**: Persistir “Esta semana” / “Este mês” / data selecionada no `localStorage` (como já feito em TasksView) para manter preferência do usuário.

### Código

- **DashboardView**: Quebrar em arquivos menores (ex.: `UnifiedAdminDashboard`, `DesignerDashboard`, `StatCard`) para facilitar manutenção e testes.
- **Constantes de texto**: Agrupar strings de UI (rótulos, mensagens, placeholders) em um arquivo de i18n ou `constants/ui.ts` para facilitar revisão e futura tradução.

---

## Como testar

1. **Login**  
   Verificar fluxo de login, erro de perfil e redirecionamento.

2. **Demandas**  
   Adicionar, editar, excluir e adicionar em massa; conferir filtros e agrupamento por semana.

3. **Designers**  
   Criar, editar, remover designer; abrir modal de vales/adiantamentos e adicionar/remover.

4. **Relatórios**  
   Alterar data, “Esta semana” / “Este mês”, copiar relatório TXT e conferir valores.

5. **Modal**  
   Abrir qualquer modal (nova demanda, editar designer, etc.), fechar com Escape e clicando fora; verificar se o scroll do body é bloqueado e se o foco vai para o conteúdo do modal.

6. **Erro de API**  
   Simular falha (ex.: desconectar rede ao salvar) e verificar se o banner de erro aparece e pode ser fechado.

7. **Configuração**  
   Com Supabase não configurado, verificar se a tela `ConfigurationErrorView` é exibida corretamente.
