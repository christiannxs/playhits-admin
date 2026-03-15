import React, { useState, useMemo } from 'react';
import { Designer, Task, DesignerType, Advance } from '../types';
import { getWeekRange, getMonthRange, formatCurrency, formatDate, calculateWeeklyPaymentHistory, getTaskPayableValue, isTaskInPeriod } from '../utils/dateUtils';
import { ClipboardCopyIcon, CalendarIcon, UserIcon, CashIcon, CheckCircleIcon } from './icons/Icons';
import EmptyState from './EmptyState';

interface FinancialControlViewProps {
  designers: Designer[];
  tasks: Task[];
  advances: Advance[];
}

const FinancialControlView: React.FC<FinancialControlViewProps> = ({ designers, tasks, advances }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [copyFeedback, setCopyFeedback] = useState<'idle' | 'success' | 'error'>('idle');

  const date = useMemo(() => new Date(`${selectedDate}T12:00:00-03:00`), [selectedDate]);
  const weekRange = useMemo(() => getWeekRange(date), [date]);
  const monthRange = useMemo(() => getMonthRange(date), [date]);

  const freelancers = designers.filter(d => d.type !== DesignerType.Fixed);

  const financialControlAllTime = useMemo(() => {
    return freelancers.map(designer => {
      const allTasks = tasks.filter(t => t.designer_id === designer.id);
      const allAdvances = advances.filter(a => a.designer_id === designer.id);
      const totalFromTasks = allTasks.reduce((sum, t) => sum + getTaskPayableValue(t), 0);
      const totalAdvancesAmount = allAdvances.reduce((sum, a) => sum + a.amount, 0);
      const netPayment = totalFromTasks - totalAdvancesAmount;
      return {
        designer,
        allTasks,
        allAdvances,
        totalFromTasks,
        totalAdvancesAmount,
        netPayment,
        taskCount: allTasks.length,
      };
    });
  }, [freelancers, tasks, advances]);

  const financialControlTotals = useMemo(() => {
    const totalProducao = financialControlAllTime.reduce((s, r) => s + r.totalFromTasks, 0);
    const totalAdiantamentos = financialControlAllTime.reduce((s, r) => s + r.totalAdvancesAmount, 0);
    return { totalProducao, totalAdiantamentos };
  }, [financialControlAllTime]);

  const freelancerReports = useMemo(() => {
    return freelancers.map(freelancer => {
      const completedTasks = tasks.filter(task =>
        task.designer_id === freelancer.id &&
        isTaskInPeriod(task, weekRange.start, weekRange.end)
      );
      const taskTotal = completedTasks.reduce((sum, task) => sum + getTaskPayableValue(task), 0);
      const advancesInPeriod = advances.filter(adv =>
        adv.designer_id === freelancer.id &&
        new Date(adv.date) >= weekRange.start &&
        new Date(adv.date) <= weekRange.end
      );
      const advancesTotal = advancesInPeriod.reduce((sum, adv) => sum + adv.amount, 0);
      const totalPayment = taskTotal - advancesTotal;
      const paymentHistory = calculateWeeklyPaymentHistory(freelancer.id, tasks, advances);
      return { freelancer, completedTasks, advancesInPeriod, totalPayment, taskTotal, advancesTotal, paymentHistory };
    });
  }, [freelancers, tasks, advances, weekRange]);

  // Total de produção do mês: apenas freelancers
  const freelancerIds = useMemo(() => new Set(freelancers.map(d => d.id)), [freelancers]);
  const monthlyTasksTotal = tasks
    .filter(task => {
      if (!freelancerIds.has(task.designer_id)) return false; // exclui demandas de fixos
      const created = new Date(task.created_at);
      return created >= monthRange.start && created <= monthRange.end;
    })
    .reduce((sum, task) => sum + getTaskPayableValue(task), 0);

  const monthlyAdvancesTotal = advances
    .filter(adv => {
      const advDate = new Date(adv.date);
      return advDate >= monthRange.start && advDate <= monthRange.end;
    })
    .reduce((sum, adv) => sum + adv.amount, 0);

  const grandTotal = monthlyTasksTotal - monthlyAdvancesTotal;

  const handleCopyReport = () => {
    let reportText = '';

    reportText += `PAGAMENTO SEMANAL - FREELANCERS\n`;
    reportText += `Período: ${formatDate(weekRange.start.toISOString())} a ${formatDate(weekRange.end.toISOString())}\n`;
    reportText += '====================\n\n';

    const activeFreelancerReports = freelancerReports.filter(r => r.totalPayment !== 0 || r.completedTasks.length > 0);
    if (activeFreelancerReports.length > 0) {
      activeFreelancerReports.forEach(report => {
        reportText += `${report.freelancer.name}\n`;
        const mediaSummary: Record<string, { count: number; total: number }> = {};
        report.completedTasks.forEach(task => {
          if (!mediaSummary[task.media_type]) {
            mediaSummary[task.media_type] = { count: 0, total: 0 };
          }
          mediaSummary[task.media_type].count++;
          mediaSummary[task.media_type].total += getTaskPayableValue(task);
        });
        Object.entries(mediaSummary).forEach(([mediaType, summary]) => {
          reportText += `${mediaType} -> ${summary.count} = ${formatCurrency(summary.total)}\n`;
        });
        if (report.advancesTotal > 0) {
          reportText += `Adiantamentos -> - ${formatCurrency(report.advancesTotal)}\n`;
        }
        reportText += `--------------------\n`;
        reportText += `Total a Pagar: ${formatCurrency(report.totalPayment)}\n\n`;
      });
    } else {
      reportText += 'Nenhum pagamento para freelancers neste período.\n\n';
    }

    reportText += `RELATÓRIO MENSAL CONSOLIDADO\n`;
    reportText += `Mês: ${date.toLocaleString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })}\n`;
    reportText += '====================\n';
    reportText += `Custo Total (Demandas): ${formatCurrency(monthlyTasksTotal)}\n`;
    reportText += `Total Adiantamentos (Vales): -${formatCurrency(monthlyAdvancesTotal)}\n`;
    reportText += `--------------------\n`;
    reportText += `Pagamento Total do Mês: ${formatCurrency(grandTotal)}\n`;

    navigator.clipboard.writeText(reportText.trim())
      .then(() => {
        setCopyFeedback('success');
        setTimeout(() => setCopyFeedback('idle'), 2500);
      })
      .catch(() => {
        setCopyFeedback('error');
        setTimeout(() => setCopyFeedback('idle'), 2500);
      });
  };

  const setDateToThisWeek = () => setSelectedDate(new Date().toISOString().split('T')[0]);
  const setDateToThisMonth = () => {
    const d = new Date();
    setSelectedDate(new Date(d.getFullYear(), d.getMonth(), 15).toISOString().split('T')[0]);
  };

  return (
    <div className="min-h-0 flex flex-col">
      <header className="page-header flex-shrink-0 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-header-title flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                <CashIcon className="h-6 w-6" />
              </span>
              Controle Financeiro
            </h1>
            <p className="page-header-subtitle max-w-md">
              Pagamento semanal (freelancers). Histórico desde o início do sistema.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex rounded-xl border border-base-300 bg-base-100 overflow-hidden">
              <button type="button" onClick={setDateToThisWeek} className="px-3 py-2 text-xs font-medium text-base-content-secondary hover:bg-base-200 hover:text-base-content transition-colors">
                Esta semana
              </button>
              <button type="button" onClick={setDateToThisMonth} className="px-3 py-2 text-xs font-medium text-base-content-secondary hover:bg-base-200 hover:text-base-content transition-colors border-l border-base-300">
                Este mês
              </button>
            </div>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content-secondary pointer-events-none" />
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="py-2.5 pl-10 pr-4 w-full sm:w-auto min-w-[160px] rounded-xl border border-base-300 bg-base-100 focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary outline-none text-base-content text-sm" />
            </div>
            <button onClick={handleCopyReport} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all ${copyFeedback === 'success' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : copyFeedback === 'error' ? 'bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-brand-primary text-white hover:bg-brand-secondary shadow-md hover:shadow-lg'}`}>
              <ClipboardCopyIcon className="h-5 w-5" />
              <span>{copyFeedback === 'success' ? 'Copiado!' : copyFeedback === 'error' ? 'Erro ao copiar' : 'Copiar relatório TXT'}</span>
            </button>
          </div>
        </div>
      </header>

      <div id="print-area" className="flex-1 space-y-8 overflow-auto">

        <section className="section-card bg-base-100 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-base-300/60 bg-base-200/40">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
              <CashIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-base-content">Controle financeiro</h2>
              <p className="text-xs text-base-content-secondary">Freelancers — histórico completo desde o início do sistema</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-base-200/50 border-b border-base-300">
                  <th className="px-5 py-3 text-left font-semibold text-base-content">Designer</th>
                  <th className="px-5 py-3 text-right font-semibold text-base-content">Demandas</th>
                  <th className="px-5 py-3 text-right font-semibold text-base-content">Total produzido</th>
                  <th className="px-5 py-3 text-right font-semibold text-base-content">Adiantamentos</th>
                  <th className="px-5 py-3 text-right font-semibold text-base-content">Líquido</th>
                </tr>
              </thead>
              <tbody>
                {financialControlAllTime.map(({ designer, totalFromTasks, totalAdvancesAmount, netPayment, taskCount }, i) => (
                  <tr key={designer.id} className={`border-b border-base-300/30 hover:bg-base-200/40 transition-colors ${i % 2 === 1 ? 'bg-base-100' : 'bg-base-200/20'}`}>
                    <td className="px-5 py-3 font-medium text-base-content">{designer.name}</td>
                    <td className="px-5 py-3 text-right text-base-content tabular-nums">{taskCount}</td>
                    <td className="px-5 py-3 text-right font-medium text-base-content tabular-nums">{formatCurrency(totalFromTasks)}</td>
                    <td className="px-5 py-3 text-right text-error/90 tabular-nums">−{formatCurrency(totalAdvancesAmount)}</td>
                    <td className="px-5 py-3 text-right font-bold text-brand-primary tabular-nums">{formatCurrency(netPayment)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4 border-t border-base-300/60 bg-base-200/30 flex flex-wrap gap-8 justify-end text-sm">
            <div className="flex items-baseline gap-2">
              <span className="text-base-content-secondary">Soma produção:</span>
              <span className="font-bold text-base-content tabular-nums">{formatCurrency(financialControlTotals.totalProducao)}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-base-content-secondary">Soma adiantamentos:</span>
              <span className="font-bold text-error tabular-nums">−{formatCurrency(financialControlTotals.totalAdiantamentos)}</span>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 ring-1 ring-teal-500/20">
              <UserIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-base-content">Freelancers — Semanal</h2>
              <p className="text-xs text-base-content-secondary">{formatDate(weekRange.start.toISOString())} a {formatDate(weekRange.end.toISOString())}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {freelancerReports.filter(r => r.totalPayment !== 0 || r.completedTasks.length > 0 || r.advancesInPeriod.length > 0).length > 0 ? (
              freelancerReports.map(({ freelancer, completedTasks, advancesInPeriod, totalPayment, taskTotal, advancesTotal }) =>
                (taskTotal > 0 || advancesTotal > 0) && (
                  <article key={freelancer.id} className="section-card bg-base-100 rounded-2xl overflow-hidden flex flex-col transition-smooth">
                    <div className="px-4 py-3 border-b border-base-300/50 bg-base-200/40 flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-base-content truncate">{freelancer.name}</h3>
                        <span className="text-xs text-base-content-secondary">Freelancer</span>
                      </div>
                      <span className={`text-lg font-bold tabular-nums shrink-0 ${totalPayment >= 0 ? 'text-success' : 'text-error'}`}>
                        {formatCurrency(totalPayment)}
                      </span>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto max-h-72 space-y-4">
                      {completedTasks.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-base-content-secondary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <CheckCircleIcon className="h-3.5 w-3.5" /> Demandas
                          </p>
                          <ul className="space-y-1.5">
                            {completedTasks.map(task => (
                              <li key={task.id} className="flex justify-between items-center py-1.5 px-2 rounded-lg bg-base-200/50 text-sm">
                                <span className="font-medium text-base-content truncate pr-2">{task.media_type}</span>
                                <span className="text-base-content-secondary tabular-nums shrink-0">{formatCurrency(getTaskPayableValue(task))}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {advancesInPeriod.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-error/90 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <CashIcon className="h-3.5 w-3.5" /> Adiantamentos
                          </p>
                          <ul className="space-y-1.5">
                            {advancesInPeriod.map(adv => (
                              <li key={adv.id} className="flex justify-between items-center py-1.5 px-2 rounded-lg bg-error/5 border border-error/10 text-sm">
                                <span className="text-base-content-secondary text-xs truncate pr-2">{adv.description || 'Vale'}</span>
                                <span className="font-medium text-error tabular-nums shrink-0">−{formatCurrency(adv.amount)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {completedTasks.length === 0 && advancesInPeriod.length === 0 && (
                        <p className="text-center text-sm text-base-content-secondary py-4">Sem movimentação no período.</p>
                      )}
                    </div>
                    <div className="px-4 py-3 border-t border-base-300/50 bg-base-200/30 text-sm space-y-1">
                      <div className="flex justify-between text-base-content-secondary">
                        <span>Produção</span>
                        <span className="tabular-nums">{formatCurrency(taskTotal)}</span>
                      </div>
                      {advancesTotal > 0 && (
                        <div className="flex justify-between text-error/90">
                          <span>Vales</span>
                          <span className="tabular-nums">−{formatCurrency(advancesTotal)}</span>
                        </div>
                      )}
                      <div className="pt-2 mt-1 border-t border-base-300/50 flex justify-between font-bold text-base-content">
                        <span>Total a pagar</span>
                        <span className="text-brand-primary tabular-nums">{formatCurrency(totalPayment)}</span>
                      </div>
                    </div>
                  </article>
                )
              )
            ) : (
              <EmptyState
                icon={<UserIcon />}
                title="Nenhum registro para freelancers nesta semana."
                className="col-span-full"
              />
            )}
          </div>
        </section>

        <section className="section-card bg-gradient-to-br from-base-200 to-base-300/30 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-base-300/50">
            <h2 className="text-lg font-bold text-base-content">Resumo do mês</h2>
            <p className="text-xs text-base-content-secondary">{date.toLocaleString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</p>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="flex flex-col gap-1 p-4 rounded-xl bg-base-100/80 border border-base-300/30">
              <span className="text-xs font-medium text-base-content-secondary uppercase tracking-wide">Custo total</span>
              <span className="text-xl font-bold text-base-content tabular-nums">{formatCurrency(monthlyTasksTotal)}</span>
              <span className="text-xs text-base-content-secondary">Demandas</span>
            </div>
            <div className="flex flex-col gap-1 p-4 rounded-xl bg-base-100/80 border border-base-300/30">
              <span className="text-xs font-medium text-base-content-secondary uppercase tracking-wide">Vales</span>
              <span className="text-xl font-bold text-warning tabular-nums">−{formatCurrency(monthlyAdvancesTotal)}</span>
              <span className="text-xs text-base-content-secondary">A descontar</span>
            </div>
            <div className="flex flex-col gap-1 p-4 rounded-xl bg-brand-primary/10 border border-brand-primary/20">
              <span className="text-xs font-medium text-brand-primary uppercase tracking-wide">Saída de caixa</span>
              <span className="text-2xl font-bold text-brand-primary tabular-nums">{formatCurrency(grandTotal)}</span>
              <span className="text-xs text-base-content-secondary">Pagamento total do mês</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default FinancialControlView;
