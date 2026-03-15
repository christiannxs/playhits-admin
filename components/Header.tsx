
import React, { useState, useEffect } from 'react';
import { ViewType, Designer } from '../types';
import {
  ChartPieIcon,
  ClipboardDocumentListIcon,
  PresentationChartBarIcon,
  UsersIcon,
  LogoutIcon,
  CashIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from './icons/Icons';
import logophd from '../images/logophd.png';

interface HeaderProps {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  onLogout: () => void;
  loggedInUser: Designer | null;
  /** Título da view atual (ex: "Dashboard") — usado na barra mobile */
  currentPageTitle?: string;
}

const SIDEBAR_COLLAPSED_KEY = 'playhits-sidebar-collapsed';

const NavItem: React.FC<{
  view?: ViewType;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  collapsed?: boolean;
}> = ({ label, icon, isActive, onClick, collapsed }) => (
  <li>
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={collapsed ? label : undefined}
      className={`flex items-center rounded-xl text-sm font-medium transition-smooth border ${
        collapsed
          ? 'justify-center p-3.5'
          : 'gap-3 px-4 py-3.5'
      } ${
        isActive
          ? 'bg-brand-primary text-white shadow-brand border-brand-primary'
          : 'text-base-content-secondary hover:bg-base-300/70 hover:text-base-content border-transparent'
      }`}
    >
      <span className={isActive ? 'text-white' : ''}>{icon}</span>
      {!collapsed && <span>{label}</span>}
    </a>
  </li>
);

const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  onLogout,
  loggedInUser,
  currentPageTitle = 'Dashboard',
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (saved !== null) return saved === 'true';
      // No desktop, padrão é recolhido para ganhar espaço
      return typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {}
      return next;
    });
  };

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
    .filter((item) => loggedInUser && item.roles.includes(loggedInUser.role))
    .map((item) => (isFinancial && item.view === 'dashboard' ? { ...item, label: 'Painel Financeiro' } : item));

  const initials =
    loggedInUser?.name
      ?.split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';

  const handleNavClick = (view: ViewType) => {
    setActiveView(view);
    setMobileMenuOpen(false);
  };

  const handleLogoutClick = () => {
    onLogout();
    setMobileMenuOpen(false);
  };

  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches);
  const [sidebarHoverExpanded, setSidebarHoverExpanded] = useState(false);

  // Recolhido só no desktop; no mobile o drawer fica sempre expandido
  const collapsed = isDesktop && sidebarCollapsed;
  // No desktop, ao passar o mouse no menu recolhido, mostra expandido
  const expandedByHoverOrOpen = !collapsed || sidebarHoverExpanded;

  // Fechar drawer ao redimensionar para desktop + atualizar isDesktop
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = () => {
      setIsDesktop(mq.matches);
      if (mq.matches) setMobileMenuOpen(false);
    };
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Bloquear scroll do body quando drawer aberto no mobile
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const sidebarContent = (
    <>
      <div className={`flex items-center border-b border-base-300/40 transition-smooth ${!expandedByHoverOrOpen ? 'p-3 justify-center' : 'p-6 justify-center lg:justify-start'}`}>
        <h1 className="flex items-center">
          <img
            src={logophd}
            alt="Play Hits"
            className={`object-contain drop-shadow-sm transition-smooth ${!expandedByHoverOrOpen ? 'h-9 w-auto min-w-9' : 'h-12 lg:h-14 w-auto'}`}
          />
        </h1>
      </div>
      <div className={`py-4 transition-smooth ${!expandedByHoverOrOpen ? 'px-2' : 'px-4 lg:px-5'}`}>
        <div className={`rounded-xl bg-base-200/90 border border-base-300/40 flex items-center transition-smooth hover:border-base-300/60 shadow-inner-soft ${!expandedByHoverOrOpen ? 'justify-center p-2.5' : 'gap-3 px-4 py-3'}`}>
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-primary/15 text-brand-primary font-bold text-sm flex items-center justify-center ring-2 ring-brand-primary/20" title={loggedInUser?.name}>
            {initials}
          </div>
          {expandedByHoverOrOpen && (
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-base-content truncate">{loggedInUser?.name}</p>
              <p className="text-xs text-base-content-secondary mt-0.5">{loggedInUser?.role}</p>
            </div>
          )}
        </div>
      </div>
      <nav className={`flex-1 overflow-y-auto transition-smooth ${!expandedByHoverOrOpen ? 'px-2' : 'px-3 lg:px-4'}`}>
        {expandedByHoverOrOpen && <p className="px-3 mb-3 text-xs font-semibold text-base-content-secondary/80 uppercase tracking-wider">Menu</p>}
        <ul className="space-y-1.5">
          {navItems.map((item) => (
            <NavItem
              key={item.view}
              view={item.view}
              label={item.label}
              icon={item.icon}
              isActive={activeView === item.view}
              onClick={() => handleNavClick(item.view)}
              collapsed={!expandedByHoverOrOpen}
            />
          ))}
        </ul>
      </nav>
      <div className={`border-t border-base-300/40 transition-smooth ${!expandedByHoverOrOpen ? 'p-2' : 'p-4'}`}>
        <NavItem label="Sair" icon={<LogoutIcon />} isActive={false} onClick={handleLogoutClick} collapsed={!expandedByHoverOrOpen} />
        <button
          type="button"
          onClick={toggleSidebar}
          className="hidden lg:flex mt-3 w-full items-center justify-center gap-2 py-2.5 rounded-xl text-base-content-secondary hover:bg-base-300/70 hover:text-base-content transition-smooth border border-transparent"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          {expandedByHoverOrOpen && <span className="text-sm font-medium">Recolher</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Barra superior mobile */}
      <header className="lg:hidden flex-shrink-0 h-14 px-4 flex items-center justify-between bg-base-100/98 backdrop-blur-md border-b border-base-300/40 z-30 shadow-sm">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="p-2.5 -ml-2 rounded-xl text-base-content-secondary hover:bg-base-300/70 hover:text-base-content transition-smooth"
          aria-label="Abrir menu"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
        <h2 className="text-base font-semibold text-base-content truncate max-w-[55%] text-center">
          {currentPageTitle}
        </h2>
        <div className="w-10" aria-hidden />
      </header>

      {/* Overlay do drawer (mobile) */}
      <div
        role="presentation"
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${
          mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden
      />

      {/* Drawer (mobile) / Sidebar (desktop) — recolhível no desktop; hover expande */}
      <aside
        onMouseEnter={() => isDesktop && sidebarCollapsed && setSidebarHoverExpanded(true)}
        onMouseLeave={() => setSidebarHoverExpanded(false)}
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-full max-w-[min(100vw,320px)]
          ${expandedByHoverOrOpen ? 'lg:w-72' : 'lg:w-20'}
          bg-base-100/98 backdrop-blur-md
          flex flex-col border-r border-base-300/40
          transform transition-transform duration-300 ease-out lg:transform-none
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          shadow-sidebar lg:flex-shrink-0
          transition-[width] duration-300 ease-out
        `}
      >
        <div className="lg:hidden absolute top-4 right-4">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-xl text-base-content-secondary hover:bg-base-300/70 hover:text-base-content transition-smooth"
            aria-label="Fechar menu"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        {sidebarContent}
      </aside>
    </>
  );
};

export default Header;
