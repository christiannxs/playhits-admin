import React from 'react';

const TermsView: React.FC = () => {
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
                Termos de Uso
              </h1>
              <p className="text-base-content-secondary text-sm mt-2">
                Play Hits Admin · Última atualização: março de 2025
              </p>
            </header>

            <div className="prose prose-invert max-w-none space-y-6 text-base-content-secondary text-sm leading-relaxed">
              <section>
                <h2 className="text-lg font-semibold text-base-content mb-2">1. Aceitação</h2>
                <p>
                  Ao acessar e utilizar o aplicativo Play Hits Admin (“aplicativo”), você aceita
                  estes Termos de Uso. Se não concordar com qualquer parte destes termos, não
                  utilize o aplicativo.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-base-content mb-2">2. Descrição do serviço</h2>
                <p>
                  O Play Hits Admin é um painel de gestão destinado a usuários autorizados,
                  para administração de demandas, relatórios, designers e informações
                  relacionadas ao escopo definido pelo responsável pelo sistema. O acesso é
                  restrito a contas criadas e habilitadas pela administração.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-base-content mb-2">3. Uso adequado</h2>
                <p>
                  O usuário compromete-se a utilizar o aplicativo de forma lícita e ética,
                  mantendo a confidencialidade de suas credenciais e não repassando acesso a
                  terceiros não autorizados. É vedado o uso para fins ilícitos, que prejudiquem
                  o sistema ou outros usuários, ou que violem direitos de terceiros.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-base-content mb-2">4. Conta e responsabilidade</h2>
                <p>
                  O usuário é responsável por todas as atividades realizadas em sua conta.
                  Deve informar imediatamente qualquer uso não autorizado ou falha de segurança.
                  A administração reserva-se o direito de suspender ou encerrar contas em caso
                  de violação destes termos ou por necessidade operacional.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-base-content mb-2">5. Propriedade intelectual</h2>
                <p>
                  O aplicativo, incluindo sua interface, lógica e conteúdos administrativos
                  vinculados ao serviço, é de propriedade do responsável pelo desenvolvimento
                  (phd marketing inteligente / Christian Rodrigues) ou de seus licenciadores.
                  Nenhuma parte destes materiais pode ser reproduzida ou explorada comercialmente
                  sem autorização prévia.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-base-content mb-2">6. Disponibilidade e alterações</h2>
                <p>
                  O serviço é oferecido “como está”, podendo sofrer interrupções para
                  manutenção ou por motivos de força maior. O responsável pelo aplicativo
                  pode alterar funcionalidades ou estes Termos de Uso, com comunicação
                  quando relevante. O uso continuado após alterações constitui aceitação.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-base-content mb-2">7. Limitação de responsabilidade</h2>
                <p>
                  Na medida permitida pela lei, o aplicativo e seus responsáveis não se
                  responsabilizam por danos indiretos, incidentais ou consequenciais
                  decorrentes do uso ou da impossibilidade de uso do serviço, salvo em
                  casos de dolo ou culpa grave comprovados.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-base-content mb-2">8. Lei aplicável e foro</h2>
                <p>
                  Estes Termos de Uso regem-se pelas leis da República Federativa do Brasil.
                  Eventuais disputas serão submetidas ao foro da comarca do domicílio do
                  responsável pelo aplicativo, com renúncia a qualquer outro, por mais
                  privilegiado que seja.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-base-content mb-2">9. Contato</h2>
                <p>
                  Para questões relativas a estes Termos de Uso, entre em contato com o
                  responsável pelo aplicativo pelos canais indicados no aplicativo ou no
                  rodapé das páginas (phd marketing inteligente / Christian Rodrigues).
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

export default TermsView;
