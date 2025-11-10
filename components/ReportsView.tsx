import React, { useState, useMemo } from 'react';
import { Designer, Task, DesignerType, Advance } from '../types';
import { getWeekRange, getMonthRange, formatCurrency, formatDate, calculateWeeklyPaymentHistory } from '../utils/dateUtils';
import { ClipboardCopyIcon, CalendarIcon } from './icons/Icons';

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

  const freelancers = designers.filter(d => d.type === DesignerType.Freelancer);
  const fixedDesigners = designers.filter(d => d.type === DesignerType.Fixed);
  
  const freelancerReports = freelancers.map(freelancer => {
    const completedTasks = tasks.filter(task => 
      task.designerId === freelancer.id &&
      new Date(task.createdDate) >= weekRange.start &&
      new Date(task.createdDate) <= weekRange.end
    );
    const taskTotal = completedTasks.reduce((sum, task) => sum + task.value, 0);

    const advancesInPeriod = advances.filter(adv =>
      adv.designerId === freelancer.id &&
      new Date(adv.date) >= weekRange.start &&
      new Date(adv.date) <= weekRange.end
    );
    const advancesTotal = advancesInPeriod.reduce((sum, adv) => sum + adv.amount, 0);
    
    const totalPayment = taskTotal - advancesTotal;
    const paymentHistory = calculateWeeklyPaymentHistory(freelancer.id, tasks, advances);

    return { freelancer, completedTasks, advancesInPeriod, totalPayment, taskTotal, advancesTotal, paymentHistory };
  });

  const fixedReports = fixedDesigners.map(designer => {
    const completedTasks = tasks.filter(task =>
      task.designerId === designer.id &&
      new Date(task.createdDate) >= monthRange.start &&
      new Date(task.createdDate) <= monthRange.end
    );
    const advancesInPeriod = advances.filter(adv =>
      adv.designerId === designer.id &&
      new Date(adv.date) >= monthRange.start &&
      new Date(adv.date) <= monthRange.end
    );
    const advancesTotal = advancesInPeriod.reduce((sum, adv) => sum + adv.amount, 0);
    const finalSalary = (designer.salary || 0) - advancesTotal;

    return { designer, completedTasks, finalSalary, advancesTotal, salary: designer.salary || 0 };
  });

  // Consolidated Monthly Report Data
  const monthlyTasksTotal = tasks
    .filter(task => {
        const created = new Date(task.createdDate);
        return created >= monthRange.start && created <= monthRange.end;
    })
    .reduce((sum, task) => sum + task.value, 0);

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
          if (!mediaSummary[task.mediaType]) {
            mediaSummary[task.mediaType] = { count: 0, total: 0 };
          }
          mediaSummary[task.mediaType].count++;
          mediaSummary[task.mediaType].total += task.value;
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <h2 className="text-3xl font-bold text-base-content">Relatórios de Pagamento</h2>
        <div className="flex items-center gap-4">
           <div className="relative">
             <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="p-2 pl-10 border rounded-lg bg-base-100 border-base-300 focus:ring-brand-primary focus:border-brand-primary"/>
             <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content-secondary" />
           </div>
           <button onClick={handleCopyReport} className="flex items-center bg-brand-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-secondary transition-colors shadow-sm">
             <ClipboardCopyIcon />
             <span className="ml-2">Copiar Relatório</span>
           </button>
        </div>
      </div>
      
      <div id="print-area" className="space-y-8">
        {/* Freelancer Report */}
        <div className="bg-base-100 p-6 rounded-2xl shadow-md">
          <h3 className="text-xl font-bold mb-2 text-base-content">Pagamento Semanal - Freelancers</h3>
          <p className="text-sm text-base-content-secondary mb-4">Período de Referência: {formatDate(weekRange.start.toISOString())} a {formatDate(weekRange.end.toISOString())}</p>
          <div className="space-y-6">
            {freelancerReports.filter(r => r.totalPayment !== 0 || r.completedTasks.length > 0 || r.advancesInPeriod.length > 0).length > 0 ? (
                freelancerReports.map(({ freelancer, completedTasks, advancesInPeriod, totalPayment, taskTotal, advancesTotal, paymentHistory }) => (
                (taskTotal > 0 || advancesTotal > 0) && (
                  <div key={freelancer.id} className="border-t border-base-300 pt-4 first:border-t-0 first:pt-0">
                    <div className="flex justify-between items-baseline">
                      <h4 className="font-semibold text-lg text-base-content">{freelancer.name}</h4>
                    </div>
                    {completedTasks.length > 0 && (
                      <table className="w-full text-left mt-2 text-sm">
                        <thead className="border-b border-base-300">
                          <tr>
                            <th className="p-2 font-medium text-base-content-secondary">Demanda</th>
                            <th className="p-2 font-medium text-base-content-secondary">Artista</th>
                            <th className="p-2 font-medium text-base-content-secondary text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {completedTasks.map(task => (
                            <tr key={task.id} className="border-b border-base-300/50">
                              <td className="p-2">{task.description} ({task.mediaType})<br/><span className="text-xs text-base-content-secondary/70">Sol: {task.socialMedia}</span></td>
                              <td className="p-2">{task.artist}</td>
                              <td className="p-2 text-right">{formatCurrency(task.value)}</td>
                            </tr>
                          ))}
                           <tr className="font-semibold">
                              <td colSpan={2} className="p-2 text-right">Subtotal das Demandas:</td>
                              <td className="p-2 text-right">{formatCurrency(taskTotal)}</td>
                            </tr>
                        </tbody>
                      </table>
                    )}
                     {advancesInPeriod.length > 0 && (
                      <table className="w-full text-left mt-2 text-sm">
                        <thead className="border-b border-base-300">
                           <tr>
                            <th className="p-2 font-medium text-base-content-secondary">Adiantamentos (Vales)</th>
                            <th className="p-2 font-medium text-base-content-secondary text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {advancesInPeriod.map(adv => (
                            <tr key={adv.id} className="border-b border-base-300/50">
                              <td className="p-2">{adv.description} <span className="text-xs text-base-content-secondary/70">({formatDate(adv.date)})</span></td>
                              <td className="p-2 text-right text-yellow-400">-{formatCurrency(adv.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    <div className="text-right mt-2 pt-2 border-t border-base-300/50">
                        <span className="text-sm text-base-content-secondary">Total a Pagar: </span>
                        <span className="font-bold text-lg text-brand-primary">{formatCurrency(totalPayment)}</span>
                    </div>

                    {paymentHistory.length > 0 && (
                        <div className="mt-4">
                            <h5 className="font-semibold text-sm text-base-content-secondary">Histórico de Pagamentos Semanais</h5>
                             <table className="w-full max-w-sm text-left mt-1 text-xs">
                                <thead className="border-b border-base-300">
                                    <tr>
                                        <th className="p-1 font-medium text-base-content-secondary">Período</th>
                                        <th className="p-1 font-medium text-base-content-secondary text-right">Valor Pago</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paymentHistory.map(entry => (
                                        <tr key={entry.range.start.toISOString()} className="border-b border-base-300/50">
                                            <td className="p-1">{formatDate(entry.range.start.toISOString())} - {formatDate(entry.range.end.toISOString())}</td>
                                            <td className={`p-1 text-right font-medium ${entry.total >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(entry.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                  </div>
                )
              ))
            ) : (<p className="text-base-content-secondary text-center py-4">Nenhum pagamento para freelancers neste período.</p>)}
          </div>
        </div>

        <>
            {/* Fixed Salary Report */}
            <div className="bg-base-100 p-6 rounded-2xl shadow-md">
            <h3 className="text-xl font-bold mb-2 text-base-content">Relatório Mensal - Equipe Fixa</h3>
            <p className="text-sm text-base-content-secondary mb-4">Mês de Referência: {date.toLocaleString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</p>
            <table className="w-full text-left">
                <thead className="border-b border-base-300 bg-base-200/50">
                    <tr>
                        <th className="p-4 font-semibold text-base-content-secondary">Designer</th>
                        <th className="p-4 font-semibold text-base-content-secondary">Salário Base</th>
                        <th className="p-4 font-semibold text-base-content-secondary">Adiantamentos</th>
                        <th className="p-4 font-semibold text-base-content-secondary">Pagamento Final</th>
                        <th className="p-4 font-semibold text-base-content-secondary text-center">Demandas (Mês)</th>
                    </tr>
                </thead>
                <tbody>
                    {fixedReports.map(({ designer, completedTasks, finalSalary, advancesTotal }) => (
                        <tr key={designer.id} className="border-b border-base-300">
                            <td className="p-4 font-semibold text-base-content">{designer.name}</td>
                            <td className="p-4">{formatCurrency(designer.salary || 0)}</td>
                            <td className="p-4 text-yellow-400">-{formatCurrency(advancesTotal)}</td>
                            <td className="p-4 font-semibold text-brand-primary">{formatCurrency(finalSalary)}</td>
                            <td className="p-4 text-center">{completedTasks.length}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>

            {/* Consolidated Monthly Report */}
            <div className="bg-base-100 p-6 rounded-2xl shadow-md">
                <h3 className="text-xl font-bold mb-2 text-base-content">Relatório Mensal Consolidado</h3>
                <p className="text-sm text-base-content-secondary mb-4">Mês de Referência: {date.toLocaleString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</p>
                <div className="space-y-4">
                <div className="flex justify-between items-center bg-base-200/50 p-4 rounded-lg">
                    <span className="font-semibold">Custo Total (Salários Fixos + Demandas Freelas):</span>
                    <span>{formatCurrency(monthlyFixedTotal + monthlyTasksTotal)}</span>
                </div>
                <div className="flex justify-between items-center bg-base-200/50 p-4 rounded-lg">
                    <span className="font-semibold">Total Adiantamentos (Vales):</span>
                    <span className="text-yellow-400">-{formatCurrency(monthlyAdvancesTotal)}</span>
                </div>
                <div className="flex justify-between items-center bg-brand-primary/10 text-brand-primary p-4 rounded-lg">
                    <span className="font-bold text-lg">Pagamento Total do Mês:</span>
                    <span className="font-bold text-lg">{formatCurrency(grandTotal)}</span>
                </div>
                </div>
            </div>
        </>
      </div>
    </div>
  );
};

export default ReportsView;