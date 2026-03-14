import { useState, useEffect } from 'react';
import { Designer, Task, Advance, UpdateTaskPayload } from '../types';
import { MEDIA_PRICES } from '../constants';
import { supabase } from '../lib/supabaseClient';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { formatDbError, formatNetworkError } from '../utils/formatApiError';

const RLS_TASKS_HINT =
  'Ajuste as políticas RLS da tabela "tasks" no Supabase para permitir SELECT das demandas. Veja supabase/RLS_TASKS.md no projeto.';

function normalizeDueDate(raw: string | undefined): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  const trimmed = raw.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

export function useAppData() {
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [loggedInUser, setLoggedInUser] = useState<Designer | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginProfileError, setLoginProfileError] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    const loadSessionAndData = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          const { error: refreshErr } = await supabase.auth.refreshSession();
          if (refreshErr && process.env.NODE_ENV !== 'production') {
            console.warn('[Playhits] refreshSession:', refreshErr.message);
          }

          const { data: { user }, error: authError } = await supabase.auth.getUser();
          if (authError || !user) {
            await supabase.auth.signOut();
            setLoggedInUser(null);
            return;
          }

          const { data: userProfile, error: profileError } = await supabase
            .from('designers')
            .select('*')
            .eq('auth_user_id', user.id)
            .single();

          if (profileError || !userProfile) {
            setLoginProfileError('Seu perfil não foi encontrado. A sessão será encerrada.');
            await supabase.auth.signOut();
            setLoggedInUser(null);
            return;
          }

          setLoggedInUser(userProfile);
          setLoginProfileError('');

          const [designersRes, tasksRes, advancesRes] = await Promise.all([
            supabase.from('designers').select('*'),
            supabase.from('tasks').select('*').order('created_at', { ascending: false }),
            supabase.from('advances').select('*'),
          ]);

          if (designersRes.error) throw designersRes.error;
          if (tasksRes.error) throw tasksRes.error;
          if (advancesRes.error) throw advancesRes.error;

          const tasksData = Array.isArray(tasksRes.data) ? tasksRes.data : [];
          setDesigners(designersRes.data ?? []);
          setTasks(tasksData);
          setAdvances(advancesRes.data ?? []);

          if (process.env.NODE_ENV !== 'production') {
            console.log('[Playhits] Carregamento:', { tasksCount: tasksData.length, userId: user?.id });
          }
        } else {
          setLoggedInUser(null);
          setDesigners([]);
          setTasks([]);
          setAdvances([]);
        }
      } catch (error: unknown) {
        console.error('Erro crítico durante o carregamento da sessão:', error);
        const msg = error instanceof Error ? error.message : 'Erro desconhecido';
        setLoginProfileError(`Erro ao carregar dados: ${msg === 'Failed to fetch' ? formatNetworkError() : msg}`);
        await supabase.auth.signOut();
        setLoggedInUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadSessionAndData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        loadSessionAndData();
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const handleLogin = async (username: string, pass: string): Promise<{ success: boolean; message: string }> => {
    setLoginProfileError('');
    const email = `${username.toLowerCase()}@playhits.local`;
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) {
        if (error.message?.includes('Failed to fetch')) {
          return { success: false, message: formatNetworkError() };
        }
        return { success: false, message: 'Usuário ou senha inválidos.' };
      }
      return { success: true, message: '' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ocorreu um erro inesperado ao tentar entrar.';
      return { success: false, message: msg === 'Failed to fetch' ? formatNetworkError() : msg };
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLoggedInUser(null);
  };

  const addTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'value'>): Promise<boolean> => {
    setApiError(null);
    try {
      const designerId = (taskData.designer_id ?? '').trim();
      const mediaType = (taskData.media_type ?? '').trim();
      const dueDate = normalizeDueDate(taskData.due_date);
      if (!designerId || !mediaType || !dueDate) {
        setApiError('Preencha designer, tipo de mídia e data de entrega (formato YYYY-MM-DD).');
        return false;
      }
      const value = MEDIA_PRICES[mediaType]?.price ?? 0;
      const approvalStatus = taskData.approval_status === 'rejected' ? 'rejected' : 'approved';
      const payload = {
        designer_id: designerId,
        media_type: mediaType,
        due_date: dueDate,
        artist: (taskData.artist ?? '-').trim() || '-',
        social_media: (taskData.social_media ?? '-').trim() || '-',
        description: (taskData.description ?? '-').trim() || '-',
        value,
        approval_status: approvalStatus,
      };

      const { data, error } = await supabase.from('tasks').insert(payload).select().single();
      if (error) throw error;

      if (data) {
        setTasks((prev) => [data, ...prev]);
        const { data: check } = await supabase.from('tasks').select('id').eq('id', data.id).maybeSingle();
        if (!check) {
          setApiError(`Demanda foi criada, mas não está visível na leitura. Ao atualizar a página ela pode sumir. ${RLS_TASKS_HINT}`);
        }
      }
      return true;
    } catch (error: unknown) {
      console.error('Erro ao adicionar demanda:', error);
      setApiError(formatDbError(error, 'adicionar demanda'));
      return false;
    }
  };

  /** Insere várias demandas de uma vez (ex.: formulário com múltiplas linhas). */
  const insertTasks = async (payloads: Array<Omit<Task, 'id' | 'created_at' | 'value'> & { value?: number }>): Promise<boolean> => {
    setApiError(null);
    if (payloads.length === 0) {
      setApiError('Nenhuma demanda para criar.');
      return false;
    }
    try {
      const rows = payloads.map((p) => {
        const dueDate = normalizeDueDate(p.due_date);
        const mediaType = (p.media_type ?? '').trim();
        return {
          designer_id: (p.designer_id ?? '').trim(),
          media_type: mediaType,
          due_date: dueDate,
          artist: (p.artist ?? '-').trim() || '-',
          social_media: (p.social_media ?? '-').trim() || '-',
          description: (p.description ?? '-').trim() || '-',
          value: MEDIA_PRICES[mediaType]?.price ?? 0,
          approval_status: p.approval_status === 'rejected' ? 'rejected' : 'approved',
        };
      });
      const valid = rows.every((r) => r.designer_id && r.media_type && r.due_date);
      if (!valid) {
        setApiError('Todas as linhas devem ter designer, tipo de mídia (tag) e data da demanda.');
        return false;
      }
      const { data, error } = await supabase.from('tasks').insert(rows).select();
      if (error) throw error;
      if (data?.length) {
        setTasks((prev) => [...data, ...prev]);
        const firstId = data[0]?.id;
        if (firstId) {
          const { data: check } = await supabase.from('tasks').select('id').eq('id', firstId).maybeSingle();
          if (!check) {
            setApiError(`Demandas foram criadas, mas podem não estar visíveis. ${RLS_TASKS_HINT}`);
          }
        }
      }
      return true;
    } catch (error: unknown) {
      console.error('Erro ao criar demandas:', error);
      setApiError(formatDbError(error, 'criar demandas'));
      return false;
    }
  };

  const updateTask = async (taskId: string, updateData: UpdateTaskPayload) => {
    setApiError(null);
    try {
      const payload = { ...updateData };
      if (payload.media_type) {
        payload.value = MEDIA_PRICES[payload.media_type]?.price ?? 0;
      }
      const { data, error } = await supabase.from('tasks').update(payload).eq('id', taskId).select().single();
      if (error) throw error;
      if (data) {
        setTasks((prev) => prev.map((task) => (task.id === data.id ? data : task)));
      }
    } catch (error: unknown) {
      console.error('Erro ao atualizar demanda:', error);
      setApiError(formatDbError(error, 'atualizar demanda'));
    }
  };

  const deleteTask = async (taskId: string) => {
    setApiError(null);
    const { data, error } = await supabase.from('tasks').delete().eq('id', taskId).select();
    if (error) {
      setApiError(formatDbError(error, 'deletar demanda'));
      return;
    }
    if (!data?.length) {
      setApiError(
        'A operação de exclusão falhou. Nenhuma demanda foi removida. Verifique as políticas RLS para DELETE na tabela "tasks".'
      );
      return;
    }
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  const addDesigner = async (designerData: Record<string, unknown>): Promise<{ success: boolean; message: string }> => {
    const FUNCTION_TIMEOUT = 20000;
    setApiError(null);
    try {
      const functionPromise = supabase.functions.invoke('create-user-and-profile', { body: designerData });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('A operação demorou muito. Verifique sua conexão ou o status do servidor.')), FUNCTION_TIMEOUT)
      );

      const result = (await Promise.race([functionPromise, timeoutPromise])) as { data: unknown; error: unknown };
      const { data, error } = result;

      if (error) {
        if (error instanceof FunctionsHttpError) {
          try {
            const errorJson = await error.context.json() as { details?: string; error?: string };
            let msg = errorJson.details || errorJson.error || 'Erro desconhecido retornado pela função.';
            if (typeof msg === 'string') {
              if (msg.includes('already been registered')) msg = 'Já existe um usuário cadastrado com este e-mail.';
              else if (msg.includes('designers_username_key')) msg = 'Este nome de usuário já está em uso.';
            }
            return { success: false, message: `Erro do servidor: ${msg}` };
          } catch {
            const textError = await error.context.text();
            return { success: false, message: `Erro do servidor (status ${error.context.status}): ${textError}` };
          }
        }
        if (error instanceof Error && error.message === 'Failed to fetch') {
          return { success: false, message: 'Erro de conexão: não foi possível contatar o servidor (Edge Function).' };
        }
        return { success: false, message: `Erro de comunicação: ${error instanceof Error ? error.message : 'desconhecido'}` };
      }

      if (data && typeof data === 'object' && 'error' in data && (data as { error: string }).error) {
        const d = data as { error: string; details?: string };
        return { success: false, message: d.details || d.error };
      }

      if (data && typeof data === 'object' && 'id' in data) {
        setDesigners((prev) => [...[data as Designer], ...prev].sort((a, b) => a.name.localeCompare(b.name)));
        return { success: true, message: 'Designer criado com sucesso!' };
      }

      return { success: false, message: 'Resposta inválida do servidor.' };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ocorreu um erro inesperado.';
      return { success: false, message: msg === 'Failed to fetch' ? formatNetworkError() : msg };
    }
  };

  const updateDesigner = async (updatedDesigner: Designer) => {
    setApiError(null);
    const { data, error } = await supabase
      .from('designers')
      .update(updatedDesigner)
      .eq('id', updatedDesigner.id)
      .select()
      .single();
    if (error) {
      setApiError(`Falha ao atualizar designer: ${error.message}`);
      return;
    }
    if (data) setDesigners((prev) => prev.map((d) => (d.id === data.id ? data : d)));
  };

  const deleteDesigner = async (designerId: string) => {
    if (!window.confirm('Tem certeza que deseja remover este designer? Isso removerá o acesso do usuário e todos os dados associados do painel.')) return;
    setApiError(null);
    try {
      const { error } = await supabase.from('designers').delete().eq('id', designerId);
      if (error) {
        setApiError(`Falha ao remover designer: ${error.message}. Talvez existam demandas associadas.`);
        return;
      }
      setDesigners((prev) => prev.filter((d) => d.id !== designerId));
    } catch (error: unknown) {
      setApiError(`Erro inesperado ao remover designer: ${error instanceof Error ? error.message : 'desconhecido'}`);
    }
  };

  const addAdvance = async (advanceData: Omit<Advance, 'id'>) => {
    setApiError(null);
    const { data, error } = await supabase.from('advances').insert(advanceData).select().single();
    if (error) {
      setApiError(`Falha ao adicionar adiantamento: ${error.message}`);
      return;
    }
    if (data) setAdvances((prev) => [data, ...prev]);
  };

  const deleteAdvance = async (advanceId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este adiantamento?')) return;
    setApiError(null);
    const { error } = await supabase.from('advances').delete().eq('id', advanceId);
    if (error) {
      setApiError(`Falha ao deletar adiantamento: ${error.message}`);
      return;
    }
    setAdvances((prev) => prev.filter((adv) => adv.id !== advanceId));
  };

  return {
    designers,
    tasks,
    advances,
    loggedInUser,
    loading,
    loginProfileError,
    apiError,
    setApiError,
    handleLogin,
    handleLogout,
    addTask,
    insertTasks,
    updateTask,
    deleteTask,
    addDesigner,
    updateDesigner,
    deleteDesigner,
    addAdvance,
    deleteAdvance,
  };
}
