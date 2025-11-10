import React, { useState } from 'react';
import { UserIcon, LockClosedIcon } from './icons/Icons';


interface LoginViewProps {
  onLogin: (username: string, pass: string) => boolean;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const success = onLogin(username, password);
    if (!success) {
      setError('Usuário ou senha inválidos.');
    }
    // No need to set loading to false, as page will redirect/re-render
  };

  return (
    <div className="min-h-screen flex flex-col bg-base-200">
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm p-8 space-y-6 bg-base-100 rounded-2xl shadow-lg">
            <div className="flex flex-col items-center space-y-4">
                <h1 className="text-3xl font-bold text-center text-base-content">
                  <span className="text-brand-primary">Play Hits</span><br />Gerenciamento
                </h1>
                <p className="text-base-content-secondary">Acesse o painel de controle</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content-secondary" />
                <input
                type="text"
                placeholder="Usuário"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full p-3 pl-10 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary text-base-content"
                required
                />
            </div>
            <div className="relative">
                <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content-secondary" />
                <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-3 pl-10 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary text-base-content"
                required
                />
            </div>
            
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <div>
                <button
                type="submit"
                className="w-full bg-brand-primary text-white py-3 rounded-lg font-semibold hover:bg-brand-secondary transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:bg-base-300"
                disabled={loading}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
            </div>
            </form>
        </div>
      </main>
      <footer className="bg-base-100 text-center p-4 text-xs text-base-content-secondary no-print uppercase">
          aplicativo desenvolvido por Christian Rodrigues - todos direitos reservados - phd marketing inteligente
      </footer>
    </div>
  );
};

export default LoginView;