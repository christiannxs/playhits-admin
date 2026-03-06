

import React, { useState, useCallback, useEffect } from 'react';
import { Designer, Task, ViewType, Advance, UpdateTaskPayload } from './types';
import { MEDIA_PRICES } from './constants';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import TasksView from './components/TasksView';
import ReportsView from './components/ReportsView';
import DesignersView from './components/DesignersView';
import LoginView from './components/LoginView';
import { supabase, configurationError } from './lib/supabaseClient';
import { FunctionsHttpError } from '@supabase/supabase-js';

const ConfigurationErrorView: React.FC<{ message: string }> = ({ message }) => (
  <div className="min-h-screen flex flex-col bg-base-200">
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl p-8 sm:p-10 space-y-6 bg-base-100 rounded-3xl shadow-card border border-base-300/40">
        <div className="flex flex-col items-center space-y-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-red-400">
            Configuração Incompleta
          </h1>
          <p className="text-base-content-secondary text-center text-sm">
            O aplicativo não pode se conectar ao banco de dados porque as credenciais do Supabase não foram fornecidas.
          </p>
          <div className="w-full p-4 bg-base-200 rounded-xl text-base-content text-center font-mono text-sm border border-base-300/40">
            {message}
          </div>
          <p className="text-sm text-base-content-secondary text-center pt-2">
            Siga as instruções em <strong>lib/supabaseClient.ts</strong> para adicionar a URL e a Chave Pública (anon). O app será recarregado automaticamente após salvar.
          </p>
        </div>
      </div>
    </main>
    <footer className="bg-base-100 border-t border-base-300/40 text-center py-4 text-xs text-base-content-secondary no-print uppercase tracking-wider">
      aplicativo desenvolvido por Christian Rodrigues · phd marketing inteligente
    </footer>
  </div>
);


const App: React.FC = () => {
  if (configurationError || !supabase) {
    return <ConfigurationErrorView message={configurationError || "Cliente Supabase não inicializado."} />;
  }
  
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [loggedInUser, setLoggedInUser] = useState<Designer | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginProfileError, setLoginProfileError] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  // Lógica de inicialização.
  useEffect(() => {
    const loadSessionAndData = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
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
            supabase.from('tasks').select('*'),
            supabase.from('advances').select('*'),
          ]);

          if (designersRes.error) throw designersRes.error;
          if (tasksRes.error) throw tasksRes.error;
          if (advancesRes.error) throw advancesRes.error;
          
          setDesigners(designersRes.data);
          setTasks(tasksRes.data);
          setAdvances(advancesRes.data);

        } else {
          setLoggedInUser(null);
          setDesigners([]);
          setTasks([]);
          setAdvances([]);
        }
      } catch (error: any) {
        console.error("Erro crítico durante o carregamento da sessão:", error);
        
        let errorMessage = error.message || 'Erro desconhecido';
        if (errorMessage === 'Failed to fetch') {
            errorMessage = 'Falha na conexão com o servidor. Verifique sua internet.';
        }

        setLoginProfileError(`Erro ao carregar dados: ${errorMessage}`);
        await supabase.auth.signOut();
        setLoggedInUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadSessionAndData();

    // Listener para mudanças de autenticação (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadSessionAndData();
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);
  

  const handleLogin = async (username: string, pass: string): Promise<{ success: boolean; message: string }> => {
    setLoginProfileError('');
    const email = `${username.toLowerCase()}@playhits.local`;
    
    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) {
            console.error('Erro no login:', error);
            if (error.message && error.message.includes('Failed to fetch')) {
                 return { success: false, message: 'Erro de conexão com o servidor. Verifique sua internet.' };
            }
            return { success: false, message: 'Usuário ou senha inválidos.' };
        }
        return { success: true, message: '' };
    } catch (err: any) {
         console.error('Exceção no login:', err);
         if (err.message === 'Failed to fetch') {
             return { success: false, message: 'Erro de conexão com o servidor.' };
         }
        return { success: false, message: 'Ocorreu um erro inesperado ao tentar entrar.' };
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLoggedInUser(null);
  };

  const addTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'value'>): Promise<boolean> => {
    setApiError(null);
    try {
      const value = MEDIA_PRICES[taskData.media_type]?.price || 0;
      const payload = {
        designer_id: taskData.designer_id,
        media_type: taskData.media_type,
        due_date: taskData.due_date,
        artist: taskData.artist ?? '-',
        social_media: taskData.social_media ?? '-',
        description: taskData.description ?? '-',
        value,
      };
      const { data, error } = await supabase.from('tasks').insert(payload).select().single();

      if (error) {
        throw error;
      }

      if (data) {
        setTasks(prev => [data, ...prev]);
      }
      return true;
    } catch (error: any) {
      console.error('Erro detalhado ao adicionar demanda:', error);
      let errorMessage = 'Ocorreu um erro inesperado.';
      if (error && typeof error === 'object' && 'message' in error) {
        const dbError = error as { message: string; details?: string; hint?: string; code?: string };
        errorMessage = `Erro do Banco de Dados (Código: ${dbError.code || 'N/A'}):\n- Mensagem: ${dbError.message}\n- Detalhes: ${dbError.details || 'N/A'}\n- Dica: ${dbError.hint || 'N/A'}`;
      } else {
        try {
          errorMessage = `Ocorreu um erro não-padrão:\n${JSON.stringify(error, null, 2)}`;
        } catch {
          errorMessage = `Ocorreu um erro não-JSON: ${error}`;
        }
      }
      setApiError(`Falha ao adicionar demanda.\n\n${errorMessage}\n\n---\n\n**Ação Recomendada:**\nVerifique se a estrutura e as permissões da sua tabela 'tasks' no Supabase correspondem ao que o aplicativo espera.`);
      return false;
    }
  };

  const addTasksBulk = async (taskData: Omit<Task, 'id' | 'created_at' | 'value'>, quantity: number): Promise<boolean> => {
    setApiError(null);
    try {
      const value = MEDIA_PRICES[taskData.media_type]?.price || 0;
      const row = {
        designer_id: taskData.designer_id,
        media_type: taskData.media_type,
        due_date: taskData.due_date,
        artist: taskData.artist ?? '-',
        social_media: taskData.social_media ?? '-',
        description: taskData.description ?? '-',
        value,
      };
      const tasksToInsert = Array(quantity).fill(null).map(() => ({ ...row }));

      const { data, error } = await supabase.from('tasks').insert(tasksToInsert).select();

      if (error) {
        console.error('Erro ao inserir demandas em massa:', error);
        throw error;
      }

      if (data && data.length > 0) {
        setTasks(prev => [...data, ...prev]);
      } else {
        const { data: refreshedTasks, error: refreshError } = await supabase.from('tasks').select('*');
        if (!refreshError && refreshedTasks) {
          setTasks(refreshedTasks);
        }
      }
      return true;
    } catch (error: any) {
      console.error('Erro detalhado ao adicionar demandas em massa:', error);
      let errorMessage = 'Ocorreu um erro inesperado.';
      if (error && typeof error === 'object' && 'message' in error) {
        const dbError = error as { message: string; details?: string; hint?: string; code?: string };
        errorMessage = `Erro do Banco de Dados (Código: ${dbError.code || 'N/A'}):\n- Mensagem: ${dbError.message}\n- Detalhes: ${dbError.details || 'N/A'}\n- Dica: ${dbError.hint || 'N/A'}`;
      } else {
        try {
          errorMessage = `Ocorreu um erro não-padrão:\n${JSON.stringify(error, null, 2)}`;
        } catch {
          errorMessage = `Ocorreu um erro não-JSON: ${error}`;
        }
      }
      setApiError(`Falha ao adicionar demandas em massa.\n\n${errorMessage}\n\n---\n\n**Ação Recomendada:**\nVerifique se a estrutura e as permissões da sua tabela 'tasks' no Supabase correspondem ao que o aplicativo espera.`);
      return false;
    }
  };

  const updateTask = async (taskId: string, updateData: UpdateTaskPayload) => {
    setApiError(null);
    try {
        const payload = { ...updateData };
        if (payload.media_type) {
            payload.value = MEDIA_PRICES[payload.media_type]?.price || 0;
        }

        const { data, error } = await supabase.from('tasks').update(payload).eq('id', taskId).select().single();
        
        if (error) {
            throw error;
        }

        if (data) {
            setTasks(prev => prev.map(task => task.id === data.id ? data : task));
        }
    } catch (error: any) {
        console.error('Erro detalhado ao atualizar demanda:', error);
        let errorMessage = 'Ocorreu um erro inesperado.';
        if (error && typeof error === 'object' && 'message' in error) {
            const dbError = error as { message: string; details?: string; hint?: string; code?: string };
            errorMessage = `Erro do Banco de Dados (Código: ${dbError.code || 'N/A'}):\n- Mensagem: ${dbError.message}\n- Detalhes: ${dbError.details || 'N/A'}\n- Dica: ${dbError.hint || 'N/A'}`;
        } else {
             try {
                errorMessage = `Ocorreu um erro não-padrão:\n${JSON.stringify(error, null, 2)}`;
              } catch {
                errorMessage = `Ocorreu um erro não-JSON: ${error}`;
              }
        }
        setApiError(`Falha ao atualizar demanda.\n\n${errorMessage}\n\n---\n\n**Ação Recomendada:**\nVerifique se a estrutura da tabela 'tasks' no Supabase corresponde ao que o aplicativo espera.`);
    }
  };

  const deleteTask = async (taskId: string) => {
    setApiError(null);

    const { data, error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .select();

    if (error) {
      console.error('Erro detalhado ao deletar demanda:', error);
      const dbError = error as { message: string; details?: string; hint?: string; code?: string };
      const errorMessage = `Erro do Banco de Dados (Código: ${dbError.code || 'N/A'}):\n- Mensagem: ${dbError.message}\n- Detalhes: ${dbError.details || 'N/A'}`;
      setApiError(`Falha ao deletar demanda.\n\n${errorMessage}\n\n---\n\n**Ação Recomendada:**\nVerifique as políticas de segurança (Row Level Security) da sua tabela 'tasks' no Supabase. Certifique-se de que a role do seu usuário ('Diretor de Arte') tem permissão para a operação 'DELETE'.`);
      return;
    }

    if (!data || data.length === 0) {
      console.error('Nenhuma demanda foi deletada. Provável falha de RLS.');
      setApiError(`A operação de exclusão falhou.\n\nNenhuma demanda foi removida, o que geralmente indica um problema de permissão.\n\n---\n\n**Ação Recomendada:**\nVerifique se a política de segurança (Row Level Security) para 'DELETE' na tabela 'tasks' está corretamente configurada no Supabase para permitir que a sua função ('Diretor de Arte') execute esta ação.`);
      return;
    }

    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const addDesigner = async (designerData: any): Promise<{ success: boolean; message: string }> => {
    const FUNCTION_TIMEOUT = 20000;
    setApiError(null);

    try {
        const functionPromise = supabase.functions.invoke('create-user-and-profile', {
            body: designerData,
        });

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('A operação demou muito para responder. Verifique sua conexão ou o status do servidor (Edge Function).')), FUNCTION_TIMEOUT)
        );

        const result: { data: any; error: any } = await Promise.race([functionPromise, timeoutPromise as any]);
        
        const { data, error } = result;

        if (error) {
            console.error('Erro ao chamar a Edge Function:', error);
            
            if (error instanceof FunctionsHttpError) {
                try {
                    const errorJson = await error.context.json();
                    let detailedMessage = errorJson.details || errorJson.error || 'Erro desconhecido retornado pela função.';
                    
                    if (typeof detailedMessage === 'string') {
                        if (detailedMessage.includes('A user with this email address has already been registered')) {
                            detailedMessage = 'Já existe um usuário cadastrado com este e-mail.';
                        } else if (detailedMessage.includes('duplicate key value violates unique constraint "designers_username_key"')) {
                            detailedMessage = 'Este nome de usuário já está em uso.';
                        }
                    }
                    return { success: false, message: `Erro do servidor: ${detailedMessage}` };

                } catch (e) {
                    const textError = await error.context.text();
                    return { success: false, message: `Erro do servidor (status ${error.context.status}): ${textError}` };
                }
            }
             // Captura genérica de erro de fetch na function
            if (error.message === 'Failed to fetch') {
                 return { success: false, message: 'Erro de conexão: Não foi possível contatar o servidor (Edge Function). Verifique se a função está implantada e acessível.' };
            }

            return { success: false, message: `Erro de comunicação: ${error.message}` };
        }
        
        if (data.error) {
            console.error('Erro na criação do designer (payload):', data.error);
            return { success: false, message: data.details || data.error };
        }

        setDesigners(prev => [data, ...prev].sort((a,b) => a.name.localeCompare(b.name)));
        return { success: true, message: 'Designer criado com sucesso!' };

    } catch (e: any) {
        console.error('Erro inesperado (possivelmente timeout) ao adicionar designer:', e);
         if (e.message === 'Failed to fetch') {
             return { success: false, message: 'Erro de conexão: Não foi possível contatar o servidor.' };
         }
        return { success: false, message: e.message || 'Ocorreu um erro inesperado.' };
    }
  };

  const updateDesigner = async (updatedDesigner: Designer) => {
    setApiError(null);
    const { data, error } = await supabase.from('designers').update(updatedDesigner).eq('id', updatedDesigner.id).select().single();
    if (error) {
        console.error('Erro ao atualizar designer:', error);
        setApiError(`Falha ao atualizar designer: ${error.message}`);
    }
    else if (data) setDesigners(prev => prev.map(d => d.id === data.id ? data : d));
  };
  
  const deleteDesigner = async (designerId: string) => {
    if (window.confirm('Tem certeza que deseja remover este designer? Isso removerá o acesso do usuário e todos os dados associados do painel.')) {
        setApiError(null);
        try {
            const { error } = await supabase.from('designers').delete().eq('id', designerId);
            if (error) {
                console.error('Erro ao remover designer:', error);
                setApiError(`Falha ao remover designer: ${error.message}. Talvez existam demandas associadas que impedem a exclusão.`);
            } else {
                setDesigners(prev => prev.filter(d => d.id !== designerId));
            }
        } catch (error: any) {
             setApiError(`Erro inesperado ao remover designer: ${error.message}`);
        }
    }
  };

  const addAdvance = async (advanceData: Omit<Advance, 'id'>) => {
    setApiError(null);
    const { data, error } = await supabase.from('advances').insert(advanceData).select().single();
    if (error) {
        console.error('Erro ao adicionar adiantamento:', error);
        setApiError(`Falha ao adicionar adiantamento: ${error.message}`);
    }
    else if(data) setAdvances(prev => [data, ...prev]);
  };

  const deleteAdvance = async (advanceId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este adiantamento?')) {
      setApiError(null);
      const { error } = await supabase.from('advances').delete().eq('id', advanceId);
      if (error) {
        console.error('Erro ao deletar adiantamento:', error);
        setApiError(`Falha ao deletar adiantamento: ${error.message}`);
      }
      else setAdvances(prev => prev.filter(adv => adv.id !== advanceId));
    }
  };

  const renderView = () => {
    if (!loggedInUser) return null;
    const isDirector = loggedInUser.role === 'Diretor de Arte';
    const isFinancial = loggedInUser.role === 'Financeiro';

    switch (activeView) {
      case 'dashboard':
        return <DashboardView designers={designers} tasks={tasks} advances={advances} loggedInUser={loggedInUser} />;
      case 'tasks':
        if (isFinancial) {
          setActiveView('dashboard');
          return null;
        }
        return <TasksView tasks={tasks} designers={designers} onAddTask={addTask} onAddTasksBulk={addTasksBulk} onUpdateTask={updateTask} onDeleteTask={deleteTask} loggedInUser={loggedInUser} />;
      case 'reports':
        if (!isDirector && !isFinancial) {
            setActiveView('dashboard');
            return null;
        }
        return <ReportsView designers={designers} tasks={tasks} advances={advances} loggedInUser={loggedInUser} />;
      case 'designers':
         if (!isDirector) {
            setActiveView('dashboard');
            return null;
         }
        return <DesignersView 
            designers={designers} 
            tasks={tasks} 
            onAddDesigner={addDesigner} 
            onUpdateDesigner={updateDesigner} 
            onDeleteDesigner={deleteDesigner}
            advances={advances} 
            onAddAdvance={addAdvance} 
            onDeleteAdvance={deleteAdvance} 
        />;
      default:
        setActiveView('dashboard');
        return null;
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 gap-6">
        <div className="w-12 h-12 rounded-full border-2 border-base-300 border-t-brand-primary animate-spin-slow" aria-hidden />
        <p className="text-base-content-secondary font-medium">Carregando...</p>
      </div>
    );
  }

  if (!loggedInUser) {
    return <LoginView onLogin={handleLogin} profileError={loginProfileError} />;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Header activeView={activeView} setActiveView={setActiveView} onLogout={handleLogout} loggedInUser={loggedInUser} />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="main-content-scroll flex-1 p-6 sm:p-8 lg:p-10 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full">
          {apiError && (
            <div className="bg-red-900/30 border border-red-500/40 text-red-200 p-5 rounded-2xl mb-8 relative shadow-card">
              <h4 className="font-semibold mb-2">Ocorreu um Erro</h4>
              <pre className="text-sm whitespace-pre-wrap font-sans opacity-90">{apiError}</pre>
              <button
                onClick={() => setApiError(null)}
                className="absolute top-4 right-4 text-red-300 hover:text-white text-xl font-bold leading-none p-1 rounded-xl hover:bg-red-500/20 transition-smooth"
                aria-label="Fechar aviso"
              >&times;</button>
            </div>
          )}
          {renderView()}
          </div>
        </main>
        <footer className="bg-base-100/90 backdrop-blur-sm border-t border-base-300/40 text-center py-4 text-xs text-base-content-secondary/80 no-print uppercase tracking-wider">
          aplicativo desenvolvido por Christian Rodrigues · phd marketing inteligente
        </footer>
      </div>
    </div>
  );
};

export default App;
