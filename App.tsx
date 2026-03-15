import React, { useState, useEffect } from 'react';
import { ViewType, Designer } from './types';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import TasksView from './components/TasksView';
import ReportsView from './components/ReportsView';
import FinancialControlView from './components/FinancialControlView';
import DesignersView from './components/DesignersView';
import LoginView from './components/LoginView';
import ConfigurationErrorView from './components/ConfigurationErrorView';
import { ViewErrorBoundary } from './components/ViewErrorBoundary';
import { configurationError, supabase } from './lib/supabaseClient';
import { useAppData } from './hooks/useAppData';

const App: React.FC = () => {
  if (configurationError || !supabase) {
    return <ConfigurationErrorView message={configurationError ?? 'Cliente Supabase não inicializado.'} />;
  }

  const {
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
  } = useAppData();

  const [activeView, setActiveView] = useState<ViewType>('dashboard');

  useEffect(() => {
    if (!loggedInUser) return;
    const isDirector = loggedInUser.role === 'Diretor de Arte';
    const isFinancial = loggedInUser.role === 'Financeiro';
    const allowed =
      activeView === 'dashboard' ||
      (activeView === 'tasks' && !isFinancial) ||
      (activeView === 'financial-control' && (isDirector || isFinancial)) ||
      (activeView === 'reports' && (isDirector || isFinancial)) ||
      (activeView === 'designers' && isDirector);
    if (!allowed) setActiveView('dashboard');
  }, [loggedInUser, activeView]);

  const renderView = () => {
    if (!loggedInUser) return null;
    const isDirector = loggedInUser.role === 'Diretor de Arte';
    const isFinancial = loggedInUser.role === 'Financeiro';

    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardView
            designers={designers}
            tasks={tasks}
            advances={advances}
            loggedInUser={loggedInUser}
          />
        );
      case 'tasks':
        if (isFinancial) return null;
        return (
          <TasksView
            tasks={tasks}
            designers={designers}
            onAddTask={addTask}
            onInsertTasks={insertTasks}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            loggedInUser={loggedInUser}
          />
        );
      case 'financial-control':
        if (!isDirector && !isFinancial) return null;
        return (
          <FinancialControlView
            designers={designers}
            tasks={tasks}
            advances={advances}
          />
        );
      case 'reports':
        if (!isDirector && !isFinancial) return null;
        return (
          <ReportsView
            designers={designers}
            tasks={tasks}
            advances={advances}
            loggedInUser={loggedInUser}
          />
        );
      case 'designers':
        if (!isDirector) return null;
        return (
          <DesignersView
            designers={designers}
            tasks={tasks}
            onAddDesigner={addDesigner}
            onUpdateDesigner={updateDesigner}
            onDeleteDesigner={deleteDesigner}
            advances={advances}
            onAddAdvance={addAdvance}
            onDeleteAdvance={deleteAdvance}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 gap-6 px-4">
        <div
          className="w-14 h-14 rounded-full border-2 border-base-300 border-t-brand-primary animate-spin-slow"
          aria-hidden
        />
        <p className="text-base-content-secondary font-medium text-lg">Carregando...</p>
        <p className="text-base-content-secondary/70 text-sm">Conectando ao painel</p>
      </div>
    );
  }

  if (!loggedInUser) {
    return <LoginView onLogin={handleLogin} profileError={loginProfileError} />;
  }

  const viewNames: Record<ViewType, string> = {
    dashboard: 'Dashboard',
    tasks: 'Demandas',
    'financial-control': 'Controle Financeiro',
    reports: 'Relatórios',
    designers: 'Designers',
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-base-200">
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        onLogout={handleLogout}
        loggedInUser={loggedInUser}
        currentPageTitle={viewNames[activeView]}
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <main className="main-content-scroll flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 overflow-y-auto">
          <div className="max-w-5xl mx-auto w-full">
            {apiError && (
              <div
                className="bg-red-900/30 border border-red-500/40 text-red-200 p-4 rounded-2xl mb-6 relative shadow-card flex flex-col gap-2"
                role="alert"
              >
                <div className="flex items-start justify-between gap-4">
                  <h4 className="font-semibold text-red-100">Ocorreu um erro</h4>
                  <button
                    type="button"
                    onClick={() => setApiError(null)}
                    className="shrink-0 p-1.5 rounded-lg text-red-300 hover:text-white hover:bg-red-500/20 transition-smooth"
                    aria-label="Fechar aviso de erro"
                  >
                    &times;
                  </button>
                </div>
                <pre className="text-sm whitespace-pre-wrap font-sans opacity-90 overflow-x-auto">
                  {apiError}
                </pre>
              </div>
            )}
            <ViewErrorBoundary
              viewName={viewNames[activeView]}
              onReset={() => setActiveView('dashboard')}
            >
              <div key={activeView} className="animate-fade-in">
                {renderView()}
              </div>
            </ViewErrorBoundary>
          </div>
        </main>
        <footer className="flex-shrink-0 bg-base-100/90 backdrop-blur-sm border-t border-base-300/40 text-center py-4 text-xs text-base-content-secondary/80 no-print uppercase tracking-widest px-4">
          Desenvolvido por Christian Rodrigues · PhD Marketing Inteligente
        </footer>
      </div>
    </div>
  );
};

export default App;
