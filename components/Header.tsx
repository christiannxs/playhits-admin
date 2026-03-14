
import React from 'react';
import { ViewType, Designer } from '../types';
import { ChartPieIcon, ClipboardDocumentListIcon, PresentationChartBarIcon, UsersIcon, LogoutIcon, MusicNoteIcon, CashIcon } from './icons/Icons';
import logophd from '../images/logophd.png';


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
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-smooth ${
        isActive
          ? 'bg-brand-primary text-white shadow-brand border border-brand-secondary/20'
          : 'text-base-content-secondary hover:bg-base-300/70 hover:text-base-content border border-transparent'
      }`}
    >
      <span className={isActive ? 'text-white' : ''}>{icon}</span>
      <span>{label}</span>
    </a>
  </li>
);

const Header: React.FC<HeaderProps> = ({ activeView, setActiveView, onLogout, loggedInUser }) => {
  const isDirector = loggedInUser?.role === 'Diretor de Arte';
  const isFinancial = loggedInUser?.role === 'Financeiro';

  const allNavItems: { view: ViewType; label: string; icon: React.ReactNode; roles: string[] }[] = [
    { view: 'dashboard', label: 'Dashboard', icon: <ChartPieIcon />, roles: ['Diretor de Arte', 'Designer', 'Freelancer', 'Financeiro'] },
    { view: 'tasks', label: 'Demandas', icon: <ClipboardDocumentListIcon />, roles: ['Diretor de Arte', 'Designer', 'Freelancer'] },
    { view: 'financial-control', label: 'Controle Financeiro', icon: <CashIcon />, roles: ['Diretor de Arte', 'Financeiro'] },
    { view: 'reports', label: 'Relatórios', icon: <PresentationChartBarIcon />, roles: ['Diretor de Arte', 'Financeiro'] },
    { view: 'designers', label: 'Designers', icon: <UsersIcon />, roles: ['Diretor de Arte'] },
  ];

  const navItems = allNavItems
    .filter(item => loggedInUser && item.roles.includes(loggedInUser.role))
    .map(item => (isFinancial && item.view === 'dashboard' ? { ...item, label: 'Painel Financeiro' } : item));

  const initials = loggedInUser?.name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  return (
    <aside className="w-full lg:w-72 bg-base-100/98 backdrop-blur-md shadow-sidebar lg:flex-shrink-0 flex flex-col border-r border-base-300/40">
      <div className="p-6 flex items-center justify-center lg:justify-start border-b border-base-300/40">
        <h1 className="flex items-center">
          <img src={logophd} alt="Play Hits Gerenciamento" className="h-14 w-auto object-contain drop-shadow-sm" />
        </h1>
      </div>
      <div className="px-5 py-4">
        <div className="rounded-xl bg-base-200/90 px-4 py-3.5 border border-base-300/40 flex items-center gap-3 transition-smooth hover:border-base-300/60 shadow-inner-soft">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-primary/15 text-brand-primary font-bold text-sm flex items-center justify-center ring-2 ring-brand-primary/20">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-base-content truncate">{loggedInUser?.name}</p>
            <p className="text-xs text-base-content-secondary mt-0.5">{loggedInUser?.role}</p>
          </div>
        </div>
      </div>
      <nav className="px-4 flex-1">
        <ul className="space-y-1.5">
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
      <div className="p-4 border-t border-base-300/40">
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