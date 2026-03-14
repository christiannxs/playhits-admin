/**
 * Formata erros do Supabase/API para exibição consistente na UI.
 */
export function formatDbError(error: unknown, context: string): string {
  const prefix = `Falha ao ${context}.\n\n`;
  if (error != null && typeof error === 'object' && 'message' in error) {
    const dbError = error as { message: string; details?: string; hint?: string; code?: string };
    const details = dbError.details || 'N/A';
    const hint = dbError.hint || 'N/A';
    const code = dbError.code || 'N/A';
    return `${prefix}Erro do Banco de Dados (Código: ${code}):\n- Mensagem: ${dbError.message}\n- Detalhes: ${details}\n- Dica: ${hint}\n\n---\n\n**Ação Recomendada:**\nVerifique a estrutura e as permissões no Supabase (RLS) conforme a documentação do projeto.`;
  }
  try {
    return `${prefix}${JSON.stringify(error, null, 2)}`;
  } catch {
    return `${prefix}Ocorreu um erro inesperado.`;
  }
}

export function formatNetworkError(): string {
  return 'Falha na conexão com o servidor. Verifique sua internet.';
}
