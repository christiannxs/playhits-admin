import React from 'react';

const PrivacyPolicyView: React.FC = () => {
  const goBack = () => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };

  return (
    <div className="min-h-screen flex flex-col bg-base-200">
      <main className="flex-1 p-6 sm:p-8 lg:p-10">
        <div className="max-w-3xl mx-auto">
          <button
            type="button"
            onClick={goBack}
            className="text-base-content-secondary hover:text-base-content text-sm font-medium mb-8 transition-smooth"
          >
            ← Voltar ao aplicativo
          </button>

          <article className="bg-base-100 rounded-3xl shadow-card border border-base-300/40 p-8 sm:p-10 space-y-8">
            <header>
              <h1 className="text-2xl sm:text-3xl font-bold text-base-content">
                Política de Privacidade
              </h1>
              <p className="text-base-content-secondary text-sm mt-2">
                Play Hits Admin · Última atualização: março de 2025
              </p>
            </header>

            <div className="prose prose-invert max-w-none space-y-6 text-base-content-secondary text-sm leading-relaxed">
              <section>
                <h2 className="text-lg font-semibold text-base-content mb-2">1. Introdução</h2>
                <p>
                  Esta Política de Privacidade descreve como o aplicativo Play Hits Admin (“aplicativo”)
                  coleta, usa e protege as informações dos usuários. O uso do aplicativo implica a
                  aceitação desta política.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-base-content mb-2">2. Dados coletados</h2>
                <p>
                  O aplicativo utiliza dados necessários ao funcionamento do painel administrativo,
                  incluindo identificação do usuário (vinculada à autenticação), dados de perfil
                  (nome, função) e informações relacionadas às demandas e relatórios geridos no sistema.
                  Os dados são armazenados em infraestrutura segura (Supabase) e utilizados apenas
                  no contexto do serviço.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-base-content mb-2">3. Finalidade do uso</h2>
                <p>
                  Os dados são utilizados exclusivamente para: autenticação e controle de acesso,
                  gestão de demandas e relatórios, e operação do painel. Não realizamos uso dos
                  dados para fins de marketing ou publicidade não relacionados ao serviço.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-base-content mb-2">4. Compartilhamento</h2>
                <p>
                  As informações não são vendidas nem compartilhadas com terceiros para fins
                  comerciais. O compartilhamento ocorre apenas quando exigido por lei ou para
                  prestação de serviços técnicos essenciais (por exemplo, hospedagem e banco
                  de dados), sob compromissos de confidencialidade e segurança.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-base-content mb-2">5. Segurança e retenção</h2>
                <p>
                  Adotamos medidas técnicas e organizacionais para proteger os dados contra
                  acesso não autorizado, alteração ou divulgação. Os dados são mantidos pelo
                  tempo necessário à prestação do serviço e ao cumprimento de obrigações legais.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-base-content mb-2">6. Seus direitos</h2>
                <p>
                  Em conformidade com a legislação aplicável (incluindo a LGPD), você pode
                  solicitar acesso, correção, exclusão ou portabilidade dos seus dados pessoais,
                  bem como revogar consentimentos quando aplicável. Para exercer esses direitos,
                  entre em contato com o responsável pelo tratamento indicado no aplicativo.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-base-content mb-2">7. Alterações</h2>
                <p>
                  Esta política pode ser atualizada. Alterações relevantes serão comunicadas
                  por meio do aplicativo ou por canal de contato disponível. O uso continuado
                  após as alterações constitui aceitação da nova versão.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-base-content mb-2">8. Contato</h2>
                <p>
                  Dúvidas sobre esta Política de Privacidade podem ser dirigidas ao responsável
                  pelo aplicativo (phd marketing inteligente / Christian Rodrigues), por meio
                  dos canais de contato disponibilizados no próprio aplicativo ou no rodapé
                  das páginas.
                </p>
              </section>
            </div>
          </article>
        </div>
      </main>
      <footer className="bg-base-100/90 backdrop-blur-sm border-t border-base-300/40 text-center py-4 text-xs text-base-content-secondary no-print uppercase tracking-wider">
        aplicativo desenvolvido por Christian Rodrigues · phd marketing inteligente
      </footer>
    </div>
  );
};

export default PrivacyPolicyView;
