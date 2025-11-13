
import React from 'react';
import { ViewType, Designer } from '../types';
import { ChartPieIcon, ClipboardDocumentListIcon, PresentationChartBarIcon, UsersIcon, LogoutIcon, MusicNoteIcon, CodeBracketIcon } from './icons/Icons';


interface HeaderProps {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  onLogout: () => void;
  loggedInUser: Designer | null;
}

const NavItem: React.FC<{
  view?: ViewType;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
  <li>
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`flex items-center p-3 rounded-lg transition-colors duration-200 ${
        isActive
          ? 'bg-brand-primary text-white shadow-md'
          : 'text-base-content-secondary hover:bg-base-300 hover:text-base-content'
      }`}
    >
      {icon}
      <span className="ml-3 font-medium">{label}</span>
    </a>
  </li>
);

const Header: React.FC<HeaderProps> = ({ activeView, setActiveView, onLogout, loggedInUser }) => {
  const isDirector = loggedInUser?.role === 'Diretor de Arte';
  const isFinancial = loggedInUser?.role === 'Financeiro';

  const allNavItems: { view: ViewType; label: string; icon: React.ReactNode; roles: string[] }[] = [
    { view: 'dashboard', label: 'Dashboard', icon: <ChartPieIcon />, roles: ['Diretor de Arte', 'Designer', 'Freelancer', 'Financeiro'] },
    { view: 'tasks', label: 'Demandas', icon: <ClipboardDocumentListIcon />, roles: ['Diretor de Arte', 'Designer', 'Freelancer'] },
    { view: 'reports', label: 'Relatórios', icon: <PresentationChartBarIcon />, roles: ['Diretor de Arte', 'Financeiro'] },
    { view: 'designers', label: 'Designers', icon: <UsersIcon />, roles: ['Diretor de Arte'] },
    { view: 'artists', label: 'Artistas', icon: <MusicNoteIcon />, roles: ['Diretor de Arte'] },
    { view: 'sql', label: 'SQL Lab', icon: <CodeBracketIcon />, roles: ['Diretor de Arte'] },
  ];
  
  const navItems = allNavItems.filter(item => loggedInUser && item.roles.includes(loggedInUser.role));
  
  if (isFinancial) {
      const dashboardItem = navItems.find(item => item.view === 'dashboard');
      if (dashboardItem) {
          dashboardItem.label = 'Painel Financeiro';
      }
  }

  return (
    <aside className="w-full lg:w-64 bg-base-100 shadow-lg lg:flex-shrink-0 flex flex-col">
      <div className="p-6 flex items-center justify-center lg:justify-start border-b border-base-300">
        <h1 className="text-xl font-bold text-base-content whitespace-nowrap">
            <span className="text-brand-primary">Play Hits</span> Gerenciamento
        </h1>
      </div>
       <div className="px-4 pt-4 mt-2">
        <p className="text-lg font-semibold text-base-content">{loggedInUser?.name}</p>
        <p className="text-sm text-base-content-secondary">{loggedInUser?.role}</p>
      </div>
      <nav className="p-4 flex-1">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <NavItem
              key={item.view}
              view={item.view}
              label={item.label}
              icon={item.icon}
              isActive={activeView === item.view}
              onClick={() => setActiveView(item.view)}
            />
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-base-300">
         <NavItem
            label="Sair"
            icon={<LogoutIcon />}
            isActive={false}
            onClick={onLogout}
        />
      </div>
    </aside>
  );
};

export default Header;