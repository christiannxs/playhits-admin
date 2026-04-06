

import React, { useState } from 'react';
import { UserIcon, LockClosedIcon } from './icons/Icons';
import AppFooter from './AppFooter';
import logophd from '../images/logophd.png';


interface LoginViewProps {
  onLogin: (username: string, pass: string) => Promise<{ success: boolean; message: string }>;
  profileError?: string;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, profileError }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { success, message } = await onLogin(username, password);
    if (!success) {
      setError(message);
      setLoading(false);
    }
    // No need to set loading to false on success, as page will redirect/re-render via onAuthStateChange
  };

  return (
    <div className="app-fullpage relative overflow-hidden">
      <main className="flex-1 flex items-center justify-center p-6 sm:p-8 relative z-10 animate-fade-in">
        <div className="w-full max-w-md p-8 sm:p-10 space-y-8 section-card bg-base-100/98 backdrop-blur-md rounded-3xl transition-smooth">
          <div className="flex flex-col items-center space-y-5">
            <div className="p-5 rounded-2xl bg-base-200/80 border border-base-300/40 shadow-inner-soft">
              <img src={logophd} alt="Play Hits Gerenciamento" className="h-28 w-auto object-contain" />
            </div>
            <p className="text-base-content-secondary text-sm font-medium">Acesse o painel de controle</p>
          </div>

          {profileError && (
            <div className="text-sm text-amber-200 bg-amber-900/30 border border-amber-500/40 p-4 rounded-xl text-center">
              <p className="font-semibold mb-1">Aviso do Sistema</p>
              <p>{profileError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content-secondary pointer-events-none" />
              <input
                type="text"
                placeholder="Usuário"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full py-3.5 pl-12 pr-4 rounded-xl bg-base-200 border border-base-300 text-base-content placeholder-base-content-secondary focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary/60"
                required
              />
            </div>
            <div className="relative">
              <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content-secondary pointer-events-none" />
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full py-3.5 pl-12 pr-4 rounded-xl bg-base-200 border border-base-300 text-base-content placeholder-base-content-secondary focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary/60"
                required
              />
            </div>

            {error && <p className="text-sm text-red-400 text-center bg-red-900/20 py-2 rounded-lg">{error}</p>}

            <button
              type="submit"
              className="w-full bg-brand-primary text-white py-3.5 rounded-xl font-semibold hover:bg-brand-secondary transition-smooth shadow-brand hover:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-100 focus:ring-brand-primary disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </main>
      <div className="relative z-10">
        <AppFooter />
      </div>
    </div>
  );
};

export default LoginView;
