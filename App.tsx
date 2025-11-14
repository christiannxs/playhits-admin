

import React, { useState, useCallback, useEffect } from 'react';
import { Designer, Task, ViewType, Advance, UpdateTaskPayload } from './types';
import { MEDIA_PRICES } from './constants';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import TasksView from './components/TasksView';
import ReportsView from './components/ReportsView';
import DesignersView from './components/DesignersView';
import LoginView from './components/LoginView';
import SqlLabView from './components/SqlLabView';
import { supabase, configurationError } from './lib/supabaseClient';
import { FunctionsHttpError } from '@supabase/supabase-js';

const ConfigurationErrorView: React.FC<{ message: string }> = ({ message }) => (
  <div className="min-h-screen flex flex-col bg-base-200">
    <main className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl p-8 space-y-6 bg-base-100 rounded-2xl shadow-lg">
          <div className="flex flex-col items-center space-y-4">
              <h1 className="text-3xl font-bold text-center text-red-500">
                Configuração Incompleta
              </h1>
              <p className="text-base-content-secondary text-center">
                O aplicativo não pode se conectar ao banco de dados porque as credenciais do Supabase não foram fornecidas.
              </p>
              <div className="w-full p-4 bg-base-200 rounded-lg text-base-content text-center font-mono">
                {message}
              </div>
              <p className="text-sm text-base-content-secondary text-center pt-4">
                Por favor, siga as instruções no arquivo <strong>lib/supabaseClient.ts</strong> para encontrar e adicionar sua URL e Chave Pública (anon). Depois de salvar o arquivo, o aplicativo será recarregado automaticamente.
              </p>
          </div>
      </div>
    </main>
    <footer className="bg-base-100 text-center p-4 text-xs text-base-content-secondary no-print uppercase">
        aplicativo desenvolvido por Christian Rodrigues - todos direitos reservados - phd marketing inteligente
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
  const [submissionWindow, setSubmissionWindow] = useState<{isOpen: boolean; deadline: string | null}>({ isOpen: false, deadline: null });

  // Lógica de inicialização e gerenciamento de estado global da janela de envio.
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

          // Busca a configuração global da janela de envio do banco de dados.
          const { data: config, error: configError } = await supabase
            .from('app_config')
            .select('submission_is_open, submission_deadline')
            .eq('id', 1)
            .single();

          if (configError) {
            console.error("Erro ao carregar configuração do app:", configError);
          } else if (config) {
            setSubmissionWindow({ isOpen: config.submission_is_open, deadline: config.submission_deadline });
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
      } catch (error) {
        console.error("Erro crítico durante o carregamento da sessão:", error);
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

    // Listener de Realtime para a tabela de configuração global.
    // Atualiza a UI de todos os clientes instantaneamente quando um diretor altera o estado.
    const configChannel = supabase
      .channel('app_config_changes')
      // FIX: The `.on()` method for Supabase realtime channels is not generic.
      // The type argument has been removed to fix the "Untyped function calls may not accept type arguments" error.
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_config', filter: 'id=eq.1' },
        (payload) => {
          const { submission_is_open, submission_deadline } = payload.new;
          setSubmissionWindow({ isOpen: submission_is_open, deadline: submission_deadline });
        }
      )
      .subscribe();

    return () => {
      subscription?.unsubscribe();
      supabase.removeChannel(configChannel);
    };
  }, []);
  

  const handleLogin = async (username: string, pass: string): Promise<{ success: boolean; message: string }> => {
    setLoginProfileError('');
    const email = `${username.toLowerCase()}@playhits.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      console.error('Erro no login:', error.message);
      return { success: false, message: 'Usuário ou senha inválidos.' };
    }
    return { success: true, message: '' };
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLoggedInUser(null);
  };

  const toggleSubmissionWindow = useCallback(async () => {
    const currentlyOpen = submissionWindow.isOpen;
    
    let newIsOpen: boolean;
    let newDeadline: string | null;

    if (currentlyOpen) {
        newIsOpen = false;
        newDeadline = null;
    } else {
        newIsOpen = true;
        const now = new Date();
        const day = now.getDay();
        const diff = day > 5 ? 6 : 5 - day;
        const deadline = new Date(now);
        deadline.setDate(now.getDate() + diff);
        deadline.setHours(16, 0, 0, 0);
        newDeadline = deadline.toISOString();
    }
    
    const { error } = await supabase
      .from('app_config')
      .update({ submission_is_open: newIsOpen, submission_deadline: newDeadline })
      .eq('id', 1);
    
    if (error) {
        console.error("Erro ao atualizar o status de envio:", error);
        alert("Falha ao alterar o status de envio. Verifique se você tem permissão e tente novamente.");
    }
  }, [submissionWindow.isOpen]);

  const addTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'value'>) => {
    try {
      const value = MEDIA_PRICES[taskData.media_type]?.price || 0;
      const { data, error } = await supabase.from('tasks').insert({ ...taskData, value }).select().single();
      
      if (error) {
        throw error;
      }
      
      if (data) {
        setTasks(prev => [data, ...prev]);
      }
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
      alert(`Falha ao adicionar demanda.\n\n${errorMessage}\n\n---\n\n**Ação Recomendada:**\nVerifique se a estrutura e as permissões da sua tabela 'tasks' no Supabase correspondem ao que o aplicativo espera.`);
    }
  };

  const updateTask = async (taskId: string, updateData: UpdateTaskPayload) => {
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
        alert(`Falha ao atualizar demanda.\n\n${errorMessage}\n\n---\n\n**Ação Recomendada:**\nVerifique se a estrutura da tabela 'tasks' no Supabase corresponde ao que o aplicativo espera.`);
    }
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) console.error('Erro ao deletar demanda:', error);
    else setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const addDesigner = async (designerData: any): Promise<{ success: boolean; message: string }> => {
    const FUNCTION_TIMEOUT = 20000;

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
        return { success: false, message: e.message || 'Ocorreu um erro inesperado.' };
    }
  };

  const updateDesigner = async (updatedDesigner: Designer) => {
    const { data, error } = await supabase.from('designers').update(updatedDesigner).eq('id', updatedDesigner.id).select().single();
    if (error) console.error('Erro ao atualizar designer:', error);
    else if (data) setDesigners(prev => prev.map(d => d.id === data.id ? data : d));
  };
  
  const addAdvance = async (advanceData: Omit<Advance, 'id'>) => {
    const { data, error } = await supabase.from('advances').insert(advanceData).select().single();
    if (error) console.error('Erro ao adicionar adiantamento:', error);
    else if(data) setAdvances(prev => [data, ...prev]);
  };

  const deleteAdvance = async (advanceId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este adiantamento?')) {
      const { error } = await supabase.from('advances').delete().eq('id', advanceId);
      if (error) console.error('Erro ao deletar adiantamento:', error);
      else setAdvances(prev => prev.filter(adv => adv.id !== advanceId));
    }
  };

  const renderView = () => {
    if (!loggedInUser) return null;
    const isDirector = loggedInUser.role === 'Diretor de Arte';
    const isFinancial = loggedInUser.role === 'Financeiro';

    switch (activeView) {
      case 'dashboard':
        return <DashboardView designers={designers} tasks={tasks} advances={advances} loggedInUser={loggedInUser} submissionWindow={submissionWindow} onToggleSubmissionWindow={toggleSubmissionWindow} />;
      case 'tasks':
        if (isFinancial) {
          setActiveView('dashboard');
          return null;
        }
        return <TasksView tasks={tasks} designers={designers} onAddTask={addTask} onUpdateTask={updateTask} onDeleteTask={deleteTask} loggedInUser={loggedInUser} submissionWindowOpen={submissionWindow.isOpen} />;
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
        return <DesignersView designers={designers} tasks={tasks} onAddDesigner={addDesigner} onUpdateDesigner={updateDesigner} advances={advances} onAddAdvance={addAdvance} onDeleteAdvance={deleteAdvance} />;
      case 'sql':
        if (!isDirector) {
          setActiveView('dashboard');
          return null;
        }
        return <SqlLabView />;
      default:
        setActiveView('dashboard');
        return null;
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="text-base-content">Carregando...</div>
      </div>
    );
  }

  if (!loggedInUser) {
    return <LoginView onLogin={handleLogin} profileError={loginProfileError} />;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Header activeView={activeView} setActiveView={setActiveView} onLogout={handleLogout} loggedInUser={loggedInUser} />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-base-200 overflow-y-auto">
          {renderView()}
        </main>
        <footer className="bg-base-100 text-center p-4 text-xs text-base-content-secondary no-print uppercase">
          aplicativo desenvolvido por Christian Rodrigues - todos direitos reservados - phd marketing inteligente
        </footer>
      </div>
    </div>
  );
};

export default App;