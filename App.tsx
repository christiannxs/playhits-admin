
import React, { useState, useCallback, useEffect } from 'react';
import { Designer, Task, ViewType, Artist, Advance } from './types';
import { MEDIA_PRICES } from './constants';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import TasksView from './components/TasksView';
import ReportsView from './components/ReportsView';
import DesignersView from './components/DesignersView';
import LoginView from './components/LoginView';
import ArtistsView from './components/ArtistsView';
import { useLocalStorage } from './hooks/useLocalStorage';
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
  const [artists, setArtists] = useState<Artist[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [loggedInUser, setLoggedInUser] = useState<Designer | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginProfileError, setLoginProfileError] = useState('');
  const [submissionWindow, setSubmissionWindow] = useLocalStorage<{isOpen: boolean; deadline: string | null}>('submissionWindow', { isOpen: false, deadline: null });

  const fetchData = async (userId: string) => {
    try {
      const [designersRes, tasksRes, artistsRes, advancesRes] = await Promise.all([
        supabase.from('designers').select('*'),
        supabase.from('tasks').select('*'),
        supabase.from('artists').select('*'),
        supabase.from('advances').select('*'),
      ]);

      if (designersRes.error) throw designersRes.error;
      if (tasksRes.error) throw tasksRes.error;
      if (artistsRes.error) throw artistsRes.error;
      if (advancesRes.error) throw advancesRes.error;
      
      const allDesigners: Designer[] = designersRes.data;
      const currentUserProfile = allDesigners.find(d => d.auth_user_id === userId);

      setDesigners(allDesigners);
      setTasks(tasksRes.data);
      setArtists(artistsRes.data);
      setAdvances(advancesRes.data);
      
      if (currentUserProfile) {
        setLoggedInUser(currentUserProfile);
        setLoginProfileError(''); // Clear error on successful fetch
        setLoading(false);
      } else {
        const errorMsg = "Login autenticado, mas o perfil do usuário não foi encontrado no banco de dados. O User ID na tabela de Autenticação não corresponde a nenhum registro na tabela 'designers'. Verifique se o ID foi copiado corretamente.";
        console.error(errorMsg);
        setLoginProfileError(errorMsg); // Set specific error message
        await supabase.auth.signOut(); // Sign out the user
        setLoading(false);
      }
    } catch (error: any) {
      const errorMessage = error?.message || JSON.stringify(error, null, 2);
      console.error("Erro ao buscar dados:", errorMessage);
       setLoginProfileError(`Erro ao buscar dados: ${errorMessage}. Verifique as permissões de acesso (RLS) no Supabase.`);
      await supabase.auth.signOut();
      setLoading(false);
    }
  };


  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetchData(session.user.id);
      } else {
        setLoading(false);
      }
    };
    
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        await fetchData(session.user.id);
      } else {
        setLoggedInUser(null);
        setLoading(false);
      }
    });

    if (submissionWindow.isOpen && submissionWindow.deadline) {
      if (new Date() > new Date(submissionWindow.deadline)) {
        setSubmissionWindow({ isOpen: false, deadline: null });
      }
    }

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleLogin = async (username: string, pass: string): Promise<{ success: boolean; message: string }> => {
    setLoginProfileError(''); // Clear previous profile errors on a new attempt
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

  const toggleSubmissionWindow = useCallback(() => {
    setSubmissionWindow(prev => {
        if (prev.isOpen) {
            return { isOpen: false, deadline: null };
        } else {
            const now = new Date();
            const day = now.getDay(); // 0 = Sunday, 5 = Friday
            const diff = day > 5 ? 6 : 5 - day; // days until this week's Friday
            const deadline = new Date(now);
            deadline.setDate(now.getDate() + diff);
            deadline.setHours(16, 0, 0, 0);
            return { isOpen: true, deadline: deadline.toISOString() };
        }
    });
  }, [setSubmissionWindow]);

  const addTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'value'>) => {
    const value = MEDIA_PRICES[taskData.media_type]?.price || 0;
    const { data, error } = await supabase.from('tasks').insert({ ...taskData, value }).select().single();
    if (error) console.error('Erro ao adicionar demanda:', error);
    else if (data) setTasks(prev => [data, ...prev]);
  };

  const updateTask = async (updatedTask: Task) => {
    const { data, error } = await supabase.from('tasks').update(updatedTask).eq('id', updatedTask.id).select().single();
    if (error) console.error('Erro ao atualizar demanda:', error);
    else if (data) setTasks(prev => prev.map(task => task.id === data.id ? data : task));
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) console.error('Erro ao deletar demanda:', error);
    else setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const addDesigner = async (designerData: any): Promise<{ success: boolean; message: string }> => {
    const FUNCTION_TIMEOUT = 20000; // 20 seconds timeout

    try {
        const functionPromise = supabase.functions.invoke('create-user-and-profile', {
            body: designerData,
        });

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('A operação demorou muito para responder. Verifique sua conexão ou o status do servidor (Edge Function).')), FUNCTION_TIMEOUT)
        );

        // Race the function call against the timeout
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
        // This catch block will handle the rejected timeoutPromise
        console.error('Erro inesperado (possivelmente timeout) ao adicionar designer:', e);
        return { success: false, message: e.message || 'Ocorreu um erro inesperado.' };
    }
  };

  const updateDesigner = async (updatedDesigner: Designer) => {
    const { data, error } = await supabase.from('designers').update(updatedDesigner).eq('id', updatedDesigner.id).select().single();
    if (error) console.error('Erro ao atualizar designer:', error);
    else if (data) setDesigners(prev => prev.map(d => d.id === data.id ? data : d));
  };
  
  const addArtist = async (artistData: Omit<Artist, 'id'>) => {
    const { data, error } = await supabase.from('artists').insert(artistData).select().single();
    if (error) console.error('Erro ao adicionar artista:', error);
    else if (data) setArtists(prev => [data, ...prev]);
  };

  const updateArtist = async (updatedArtist: Artist) => {
    const { data, error } = await supabase.from('artists').update(updatedArtist).eq('id', updatedArtist.id).select().single();
    if (error) console.error('Erro ao atualizar artista:', error);
    else if (data) setArtists(prev => prev.map(a => a.id === data.id ? data : a));
  };

  const deleteArtist = async (artistId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este artista?')) {
      const { error } = await supabase.from('artists').delete().eq('id', artistId);
      if (error) console.error('Erro ao deletar artista:', error);
      else setArtists(prev => prev.filter(a => a.id !== artistId));
    }
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
        return <TasksView tasks={tasks} designers={designers} artists={artists} onAddTask={addTask} onUpdateTask={updateTask} onDeleteTask={deleteTask} loggedInUser={loggedInUser} submissionWindowOpen={submissionWindow.isOpen} />;
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
       case 'artists':
         if (!isDirector) {
            setActiveView('dashboard');
            return null;
         }
        return <ArtistsView artists={artists} onAddArtist={addArtist} onUpdateArtist={updateArtist} onDeleteArtist={deleteArtist} />;
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
