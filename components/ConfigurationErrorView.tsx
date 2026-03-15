import React from 'react';

interface ConfigurationErrorViewProps {
  message: string;
}

const ConfigurationErrorView: React.FC<ConfigurationErrorViewProps> = ({ message }) => (
  <div className="min-h-screen flex flex-col bg-base-200">
    <main className="flex-1 flex items-center justify-center p-6 sm:p-8">
      <div className="w-full max-w-2xl p-8 sm:p-10 space-y-6 section-card bg-base-100/98 backdrop-blur-md rounded-3xl">
        <div className="flex flex-col items-center space-y-5">
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-red-400">
            Configuração Incompleta
          </h1>
          <p className="text-base-content-secondary text-center text-sm max-w-md">
            O aplicativo não pode se conectar ao banco de dados porque as credenciais do Supabase não foram fornecidas.
          </p>
          <div className="w-full p-4 bg-base-200 rounded-xl text-base-content text-center font-mono text-sm border border-base-300/40">
            {message}
          </div>
          <p className="text-sm text-base-content-secondary text-center pt-2 max-w-md">
            Siga as instruções em <strong>lib/supabaseClient.ts</strong> para adicionar a URL e a Chave Pública (anon). O app será recarregado automaticamente após salvar.
          </p>
        </div>
      </div>
    </main>
    <footer className="bg-base-100/90 backdrop-blur-sm border-t border-base-300/40 text-center py-4 text-xs text-base-content-secondary/80 no-print uppercase tracking-widest px-4">
      Desenvolvido por Christian Rodrigues · PhD Marketing Inteligente
    </footer>
  </div>
);

export default ConfigurationErrorView;
