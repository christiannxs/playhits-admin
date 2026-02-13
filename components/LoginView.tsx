

import React, { useState } from 'react';
import { UserIcon, LockClosedIcon } from './icons/Icons';
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
    <div className="min-h-screen flex flex-col bg-base-200 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-base-200 via-base-200 to-brand-primary/5" />
      <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-brand-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-base-300/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md p-8 sm:p-10 space-y-8 bg-base-100/95 backdrop-blur-sm rounded-3xl shadow-card border border-base-300/50">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-2 rounded-2xl bg-base-200/80">
              <img src={logophd} alt="Play Hits Gerenciamento" className="h-28 w-auto object-contain" />
            </div>
            <p className="text-base-content-secondary text-sm">Acesse o painel de controle</p>
          </div>

          {profileError && (
            <div className="text-sm text-amber-200 bg-amber-900/40 border border-amber-500/50 p-4 rounded-xl text-center">
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
                className="w-full py-3.5 pl-12 pr-4 rounded-xl bg-base-200 border border-base-300 text-base-content placeholder-base-content-secondary focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-shadow"
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
                className="w-full py-3.5 pl-12 pr-4 rounded-xl bg-base-200 border border-base-300 text-base-content placeholder-base-content-secondary focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-shadow"
                required
              />
            </div>

            {error && <p className="text-sm text-red-400 text-center">{error}</p>}

            <button
              type="submit"
              className="w-full bg-brand-primary text-white py-3.5 rounded-xl font-semibold hover:bg-brand-secondary transition-all shadow-lg hover:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-100 focus:ring-brand-primary disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </main>
      <footer className="relative z-10 bg-base-100/80 backdrop-blur-sm border-t border-base-300/50 text-center py-4 text-xs text-base-content-secondary no-print uppercase tracking-wider">
        aplicativo desenvolvido por Christian Rodrigues · todos direitos reservados · phd marketing inteligente
      </footer>
    </div>
  );
};

export default LoginView;
