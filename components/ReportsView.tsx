
import React, { useState, useMemo } from 'react';
import { Designer, Task, DesignerType, Advance } from '../types';
import { getWeekRange, getMonthRange, formatCurrency, formatDate, calculateWeeklyPaymentHistory, getTaskPayableValue } from '../utils/dateUtils';
import { ClipboardCopyIcon, CalendarIcon, UserIcon, CashIcon, CheckCircleIcon, PresentationChartBarIcon } from './icons/Icons';

interface ReportsViewProps {
  designers: Designer[];
  tasks: Task[];
  advances: Advance[];
  loggedInUser: Designer;
}

const ReportsView: React.FC<ReportsViewProps> = ({ designers, tasks, advances, loggedInUser }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const date = useMemo(() => new Date(`${selectedDate}T12:00:00-03:00`), [selectedDate]);
  const weekRange = useMemo(() => getWeekRange(date), [date]);
  const monthRange = useMemo(() => getMonthRange(date), [date]);

  const fixedDesigners = designers.filter(d => d.type === DesignerType.Fixed);
  const freelancers = designers.filter(d => d.type !== DesignerType.Fixed);

  // Controle financeiro histórico: apenas freelancers, valores desde o início do sistema (sem filtro de período)
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
        new Date(task.created_at) >= weekRange.start &&
        new Date(task.created_at) <= weekRange.end
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

  const fixedReports = useMemo(() => {
    return fixedDesigners.map(designer => {
      const completedTasks = tasks.filter(task =>
        task.designer_id === designer.id &&
        new Date(task.created_at) >= monthRange.start &&
        new Date(task.created_at) <= monthRange.end
      );
      const advancesInPeriod = advances.filter(adv =>
        adv.designer_id === designer.id &&
        new Date(adv.date) >= monthRange.start &&
        new Date(adv.date) <= monthRange.end
      );
      const advancesTotal = advancesInPeriod.reduce((sum, adv) => sum + adv.amount, 0);
      const finalSalary = (designer.salary || 0) - advancesTotal;
      return { designer, completedTasks, finalSalary, advancesTotal, salary: designer.salary || 0 };
    });
  }, [fixedDesigners, tasks, advances, monthRange]);

  // Consolidated Monthly Report Data
  const monthlyTasksTotal = tasks
    .filter(task => {
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

  const monthlyFixedTotal = fixedDesigners.reduce((sum, d) => sum + (d.salary || 0), 0);
  const grandTotal = monthlyFixedTotal + monthlyTasksTotal - monthlyAdvancesTotal;
  
  const handleCopyReport = () => {
    let reportText = '';

    // Freelancers
    reportText += `PAGAMENTO SEMANAL - FREELANCERS\n`;
    reportText += `Período: ${formatDate(weekRange.start.toISOString())} a ${formatDate(weekRange.end.toISOString())}\n`;
    reportText += '====================\n\n';

    const activeFreelancerReports = freelancerReports.filter(r => r.totalPayment !== 0 || r.completedTasks.length > 0);
    if(activeFreelancerReports.length > 0) {
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

    // Fixed Team
    reportText += `RELATÓRIO MENSAL - EQUIPE FIXA\n`;
    reportText += `Mês: ${date.toLocaleString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })}\n`;
    reportText += '====================\n\n';
    fixedReports.forEach(report => {
        reportText += `${report.designer.name}\n`;
        reportText += `Salário Base: ${formatCurrency(report.salary)}\n`;
        if (report.advancesTotal > 0) {
            reportText += `Adiantamentos: -${formatCurrency(report.advancesTotal)}\n`;
        }
        reportText += `--------------------\n`;
        reportText += `Pagamento Final: ${formatCurrency(report.finalSalary)}\n\n`;
    });

    // Consolidated
    reportText += `RELATÓRIO MENSAL CONSOLIDADO\n`;
    reportText += `Mês: ${date.toLocaleString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })}\n`;
    reportText += '====================\n';
    reportText += `Custo Total (Salários + Demandas): ${formatCurrency(monthlyFixedTotal + monthlyTasksTotal)}\n`;
    reportText += `Total Adiantamentos (Vales): -${formatCurrency(monthlyAdvancesTotal)}\n`;
    reportText += `--------------------\n`;
    reportText += `Pagamento Total do Mês: ${formatCurrency(grandTotal)}\n`;

    navigator.clipboard.writeText(reportText.trim())
      .then(() => {
        alert('Relatório copiado com sucesso!');
      })
      .catch(err => {
        console.error('Falha ao copiar relatório: ', err);
        alert('Erro ao copiar relatório. Verifique as permissões do navegador.');
      });
  };

  return (
    <div className="space-y-8">
      <header className="pb-2 border-b border-base-300/40 no-print">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-base-content flex items-center gap-2">
              <PresentationChartBarIcon className="h-8 w-8 text-brand-primary hidden sm:block" />
              Relatórios Kanban
            </h2>
            <p className="text-sm text-base-content-secondary mt-1">Semanal (freelancers) e mensal (equipe fixa)</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
             <div className="relative">
               <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="py-2.5 pl-10 pr-4 border rounded-xl bg-base-100 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none text-base-content text-sm"/>
               <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content-secondary pointer-events-none" />
             </div>
             <button onClick={handleCopyReport} className="flex items-center bg-brand-primary text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-brand-secondary transition-smooth shadow-brand">
               <ClipboardCopyIcon />
               <span className="ml-2">Copiar TXT</span>
             </button>
          </div>
        </div>
      </header>
      
      <div id="print-area" className="space-y-10">

        {/* Controle financeiro — histórico desde o início do sistema */}
        <div className="bg-base-100/95 rounded-2xl border border-base-300/40 overflow-hidden shadow-card">
          <div className="flex items-center gap-2 p-4 border-b border-base-300 bg-base-200/60">
            <div className="bg-emerald-500/20 p-2 rounded-full">
              <CashIcon className="text-emerald-400 h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-base-content">Controle financeiro</h3>
              <p className="text-xs text-base-content-secondary">Freelancers e valores recebidos desde o início do sistema (histórico completo)</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-base-300">
                  <th className="text-left font-bold text-base-content">Designer</th>
                  <th className="text-right font-bold text-base-content">Demandas (qtd)</th>
                  <th className="text-right font-bold text-base-content">Total produzido</th>
                  <th className="text-right font-bold text-base-content">Adiantamentos</th>
                  <th className="text-right font-bold text-base-content">Líquido</th>
                </tr>
              </thead>
              <tbody>
                {financialControlAllTime.map(({ designer, totalFromTasks, totalAdvancesAmount, netPayment, taskCount }) => (
                  <tr key={designer.id} className="border-b border-base-300/40 hover:bg-base-200/30 transition-smooth">
                    <td className="font-medium text-base-content">{designer.name}</td>
                    <td className="text-right text-base-content">{taskCount}</td>
                    <td className="text-right font-medium text-base-content">{formatCurrency(totalFromTasks)}</td>
                    <td className="text-right text-red-400">-{formatCurrency(totalAdvancesAmount)}</td>
                    <td className="text-right font-bold text-brand-primary">{formatCurrency(netPayment)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-base-300 bg-base-200/30 flex flex-wrap gap-6 justify-end text-sm">
            <div>
              <span className="text-base-content-secondary">Soma produção (demandas): </span>
              <span className="font-bold text-base-content">{formatCurrency(financialControlTotals.totalProducao)}</span>
            </div>
            <div>
              <span className="text-base-content-secondary">Soma adiantamentos: </span>
              <span className="font-bold text-red-400">-{formatCurrency(financialControlTotals.totalAdiantamentos)}</span>
            </div>
          </div>
        </div>
        
        {/* Freelancer Section */}
        <div>
            <div className="flex items-center gap-2 mb-4">
                <div className="bg-teal-500/20 p-2 rounded-full">
                     <UserIcon className="text-teal-400 h-6 w-6" />
                </div>
                <div>
                     <h3 className="text-xl font-bold text-base-content">Freelancers (Semanal)</h3>
                     <p className="text-xs text-base-content-secondary">{formatDate(weekRange.start.toISOString())} a {formatDate(weekRange.end.toISOString())}</p>
                </div>
            </div>

            {/* Grid Kanban Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {freelancerReports.filter(r => r.totalPayment !== 0 || r.completedTasks.length > 0 || r.advancesInPeriod.length > 0).length > 0 ? (
                    freelancerReports.map(({ freelancer, completedTasks, advancesInPeriod, totalPayment, taskTotal, advancesTotal }) => (
                        (taskTotal > 0 || advancesTotal > 0) && (
                            <div key={freelancer.id} className="bg-base-100/90 backdrop-blur-sm rounded-2xl shadow-card border border-base-300/40 flex flex-col overflow-hidden h-full hover:shadow-card-hover transition-smooth">
                                {/* Card Header */}
                                <div className="bg-base-200/50 p-4 border-b border-base-300 flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-lg text-base-content leading-tight">{freelancer.name}</h4>
                                        <span className="text-xs text-base-content-secondary uppercase tracking-wide">Freelancer</span>
                                    </div>
                                    <div className="text-right">
                                         <span className={`text-lg font-bold ${totalPayment >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {formatCurrency(totalPayment)}
                                         </span>
                                    </div>
                                </div>

                                {/* Card Body (Scrollable) */}
                                <div className="flex-1 p-4 overflow-y-auto max-h-80 custom-scrollbar space-y-4">
                                    {/* Tasks Section */}
                                    {completedTasks.length > 0 && (
                                        <div>
                                            <p className="text-xs font-bold text-base-content-secondary uppercase mb-2 flex items-center gap-1">
                                                <CheckCircleIcon className="h-3 w-3" /> Demandas
                                            </p>
                                            <div className="space-y-2">
                                                {completedTasks.map(task => (
                                                    <div key={task.id} className="bg-base-200/30 p-2 rounded border border-base-300/50 text-sm">
                                                        <div className="flex justify-between">
                                                            <span className="font-medium text-base-content">{task.media_type}</span>
                                                            <span className="text-base-content-secondary">{formatCurrency(getTaskPayableValue(task))}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Advances Section */}
                                    {advancesInPeriod.length > 0 && (
                                        <div>
                                            <p className="text-xs font-bold text-red-400 uppercase mb-2 flex items-center gap-1 mt-4">
                                                <CashIcon className="h-3 w-3" /> Adiantamentos
                                            </p>
                                            <div className="space-y-2">
                                                {advancesInPeriod.map(adv => (
                                                    <div key={adv.id} className="bg-red-900/10 p-2 rounded border border-red-900/20 text-sm flex justify-between items-center">
                                                        <span className="text-base-content-secondary text-xs">{adv.description}</span>
                                                        <span className="text-red-400 font-medium">-{formatCurrency(adv.amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {(completedTasks.length === 0 && advancesInPeriod.length === 0) && (
                                        <p className="text-center text-sm text-base-content-secondary italic">Sem movimentação</p>
                                    )}
                                </div>

                                {/* Card Footer (Summary) */}
                                <div className="bg-base-200/30 p-4 border-t border-base-300 text-sm space-y-1">
                                    <div className="flex justify-between text-base-content-secondary">
                                        <span>Produção:</span>
                                        <span className="text-base-content">{formatCurrency(taskTotal)}</span>
                                    </div>
                                    {advancesTotal > 0 && (
                                        <div className="flex justify-between text-red-300">
                                            <span>Vales:</span>
                                            <span>-{formatCurrency(advancesTotal)}</span>
                                        </div>
                                    )}
                                    <div className="pt-2 mt-1 border-t border-base-300 flex justify-between font-bold text-base-content">
                                        <span>Total a Pagar:</span>
                                        <span className="text-brand-primary">{formatCurrency(totalPayment)}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    ))
                ) : (
                    <div className="col-span-full p-8 text-center bg-base-100 rounded-xl border-dashed border-2 border-base-300">
                         <p className="text-base-content-secondary">Nenhum registro encontrado para freelancers nesta semana.</p>
                    </div>
                )}
            </div>
        </div>

        {/* Fixed Team Section */}
        <div>
            <div className="flex items-center gap-2 mb-4">
                <div className="bg-indigo-500/20 p-2 rounded-full">
                     <UserIcon className="text-indigo-400 h-6 w-6" />
                </div>
                <div>
                     <h3 className="text-xl font-bold text-base-content">Equipe Fixa (Mensal)</h3>
                     <p className="text-xs text-base-content-secondary">{date.toLocaleString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</p>
                </div>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {fixedReports.map(({ designer, completedTasks, finalSalary, advancesTotal, salary }) => (
                     <div key={designer.id} className="bg-base-100/90 backdrop-blur-sm rounded-2xl shadow-card border border-base-300/40 flex flex-col overflow-hidden h-full hover:shadow-card-hover transition-smooth">
                        {/* Header */}
                         <div className="bg-base-200/50 p-4 border-b border-base-300 flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-lg text-base-content leading-tight">{designer.name}</h4>
                                <span className="text-xs text-base-content-secondary uppercase tracking-wide">Fixo</span>
                            </div>
                            <div className="text-right">
                                    <span className={`text-lg font-bold text-brand-primary`}>
                                    {formatCurrency(finalSalary)}
                                    </span>
                            </div>
                        </div>
                        
                        {/* Body */}
                        <div className="flex-1 p-4 space-y-4">
                            <div className="flex items-center justify-between bg-base-200/30 p-3 rounded-lg">
                                <span className="text-sm text-base-content-secondary">Produtividade (Demandas):</span>
                                <span className="font-bold text-base-content">{completedTasks.length}</span>
                            </div>
                            
                            {advancesTotal > 0 ? (
                                <div>
                                     <p className="text-xs font-bold text-red-400 uppercase mb-2 flex items-center gap-1">
                                        <CashIcon className="h-3 w-3" /> Adiantamentos
                                    </p>
                                    <div className="bg-red-900/10 p-3 rounded-lg border border-red-900/20 flex justify-between items-center">
                                        <span className="text-sm text-base-content-secondary">Total Vales</span>
                                        <span className="font-bold text-red-400">-{formatCurrency(advancesTotal)}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 text-center text-sm text-base-content-secondary italic bg-base-200/20 rounded-lg">
                                    Sem adiantamentos este mês.
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                         <div className="bg-base-200/30 p-4 border-t border-base-300 text-sm space-y-1">
                            <div className="flex justify-between text-base-content-secondary">
                                <span>Salário Base:</span>
                                <span className="text-base-content">{formatCurrency(salary)}</span>
                            </div>
                            {advancesTotal > 0 && (
                                <div className="flex justify-between text-red-300">
                                    <span>Vales:</span>
                                    <span>-{formatCurrency(advancesTotal)}</span>
                                </div>
                            )}
                            <div className="pt-2 mt-1 border-t border-base-300 flex justify-between font-bold text-base-content">
                                <span>Total a Receber:</span>
                                <span className="text-brand-primary">{formatCurrency(finalSalary)}</span>
                            </div>
                        </div>
                     </div>
                ))}
             </div>
        </div>

        {/* Consolidated Monthly Report (Bar at bottom) */}
        <div className="bg-base-200/80 p-6 rounded-2xl border border-base-300/40 shadow-card">
            <h3 className="text-lg font-bold mb-4 text-base-content border-b border-base-300 pb-2">Resumo Geral Consolidado</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                    <span className="text-sm text-base-content-secondary">Custo Total (Fixos + Freelas)</span>
                    <span className="text-xl font-bold text-base-content">{formatCurrency(monthlyFixedTotal + monthlyTasksTotal)}</span>
                </div>
                 <div className="flex flex-col">
                    <span className="text-sm text-base-content-secondary">Total de Vales (Recuperado)</span>
                    <span className="text-xl font-bold text-yellow-400">-{formatCurrency(monthlyAdvancesTotal)}</span>
                </div>
                 <div className="flex flex-col md:text-right">
                    <span className="text-sm text-base-content-secondary">Saída Total de Caixa</span>
                    <span className="text-2xl font-bold text-brand-primary">{formatCurrency(grandTotal)}</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
