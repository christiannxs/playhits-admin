
import React, { useState, useCallback, useEffect } from 'react';
import { Designer, Task, ViewType, Artist, Advance } from './types';
import { INITIAL_DESIGNERS, INITIAL_TASKS, INITIAL_ARTISTS, INITIAL_ADVANCES, MEDIA_PRICES } from './constants';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import TasksView from './components/TasksView';
import ReportsView from './components/ReportsView';
import DesignersView from './components/DesignersView';
import LoginView from './components/LoginView';
import ArtistsView from './components/ArtistsView';
import { useLocalStorage } from './hooks/useLocalStorage';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [designers, setDesigners] = useLocalStorage<Designer[]>('designers', INITIAL_DESIGNERS);
  const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', INITIAL_TASKS);
  const [artists, setArtists] = useLocalStorage<Artist[]>('artists', INITIAL_ARTISTS);
  const [advances, setAdvances] = useLocalStorage<Advance[]>('advances', INITIAL_ADVANCES);
  const [loggedInUser, setLoggedInUser] = useLocalStorage<Designer | null>('loggedInUser', null);
  const [submissionWindow, setSubmissionWindow] = useLocalStorage<{isOpen: boolean; deadline: string | null}>('submissionWindow', { isOpen: false, deadline: null });

  // Auto-close submission window if deadline has passed
  useEffect(() => {
    if (submissionWindow.isOpen && submissionWindow.deadline) {
      if (new Date() > new Date(submissionWindow.deadline)) {
        setSubmissionWindow({ isOpen: false, deadline: null });
      }
    }
  }, []);

  const handleLogin = (username: string, pass: string): boolean => {
    const user = designers.find(d => d.username === username && d.password === pass);
    if (user) {
      setLoggedInUser(user);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
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


  const addTask = (taskData: Omit<Task, 'id' | 'createdDate' | 'value'>) => {
    const newTask: Task = {
      ...taskData,
      id: new Date().toISOString() + Math.random(),
      createdDate: new Date().toISOString(),
      value: MEDIA_PRICES[taskData.mediaType]?.price || 0,
    };
    setTasks(prevTasks => [newTask, ...prevTasks]);
  };

  const updateTask = (updatedTask: Task) => {
    setTasks(prevTasks => prevTasks.map(task => task.id === updatedTask.id ? updatedTask : task));
  };

  const deleteTask = (taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  };

  const addDesigner = (designerData: Omit<Designer, 'id'>) => {
     const newDesigner: Designer = {
      ...designerData,
      id: designerData.username, // Use username as ID for simplicity in local version
    };
    setDesigners(prev => [...prev, newDesigner]);
  };

  const updateDesigner = (updatedDesigner: Designer) => {
    setDesigners(prev => prev.map(d => d.id === updatedDesigner.id ? updatedDesigner : d));
  };

  const addArtist = (artistData: Omit<Artist, 'id'>) => {
    const newArtist: Artist = { ...artistData, id: new Date().toISOString() };
    setArtists(prev => [...prev, newArtist]);
  };

  const updateArtist = (updatedArtist: Artist) => {
     setArtists(prev => prev.map(a => a.id === updatedArtist.id ? updatedArtist : a));
  };

  const deleteArtist = (artistId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este artista?')) {
        setArtists(prev => prev.filter(a => a.id !== artistId));
    }
  };

  const addAdvance = (advanceData: Omit<Advance, 'id'>) => {
    const newAdvance: Advance = { ...advanceData, id: new Date().toISOString() };
    setAdvances(prev => [...prev, newAdvance]);
  };

  const deleteAdvance = (advanceId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este adiantamento?')) {
        setAdvances(prev => prev.filter(adv => adv.id !== advanceId));
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

  if (!loggedInUser) {
    return <LoginView onLogin={handleLogin} />;
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