
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Designer, Task, DesignerType, Advance } from '../types';
import { getWeekRange, getMonthRange, getYearRange, formatCurrency, formatDate, calculateWeeklyPaymentHistory, toLocalDateString } from '../utils/dateUtils';
import { MoneyIcon, UsersIcon, CheckCircleIcon, CreditCardIcon, ClockIcon, PrinterIcon, CheckIcon } from './icons/Icons';
import { MEDIA_PRICES } from '../constants';

interface DashboardViewProps {
  designers: Designer[];
  tasks: Task[];
  advances: Advance[];
  loggedInUser: Designer;
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-base-100 p-6 rounded-2xl shadow-md flex items-center space-x-4 h-full">
        <div className="bg-brand-primary/10 p-3 rounded-full flex-shrink-0">
            {icon}
        </div>
        <div>
            <p className="text-sm text-base-content-secondary">{title}</p>
            <p className="text-2xl font-bold text-base-content">{value}</p>
        </div>
    </div>
);


type PeriodType = 'week' | 'month' | 'year';

const UnifiedAdminDashboard: React.FC<DashboardViewProps> = ({
  designers,
  tasks,
  advances,
  loggedInUser,
}) => {
  const [selectedDesignerId, setSelectedDesignerId] = useState('overview');
  const [periodType, setPeriodType] = useState<PeriodType>('week');

  const today = new Date();
  const weekRange = getWeekRange(today);
  const monthRange = getMonthRange(today);
  const yearRange = getYearRange(today);

  const isDirector = loggedInUser.role === 'Diretor de Arte';

  // Get the current period range based on selection
  const currentPeriodRange = periodType === 'week' ? weekRange : periodType === 'month' ? monthRange : yearRange;

  // Memoized data for the overview mode
  const overviewData = useMemo(() => {
    // Filtrar apenas Freelancers
    const freelancers = designers.filter(d => d.type === DesignerType.Freelancer);
    
    // Freelancer reports (for the table) - usando o período selecionado
    const freelancerReports = freelancers.map(designer => {
        const tasksInPeriod = tasks.filter(task =>
            task.designer_id === designer.id &&
            new Date(task.created_at) >= currentPeriodRange.start &&
            new Date(task.created_at) <= currentPeriodRange.end
        );
        const taskTotal = tasksInPeriod.reduce((sum, task) => sum + task.value, 0);
        const advancesInPeriod = advances.filter(adv =>
            adv.designer_id === designer.id &&
            new Date(adv.date) >= currentPeriodRange.start &&
            new Date(adv.date) <= currentPeriodRange.end
        );
        const advancesTotal = advancesInPeriod.reduce((sum, adv) => sum + adv.amount, 0);
        const totalPayment = taskTotal - advancesTotal;
        const periodKey = `${periodType}-${toLocalDateString(currentPeriodRange.start)}`;
        return { designer, taskTotal, advancesTotal, totalPayment, periodKey };
    });

    // Stats for the cards - usando o período selecionado
    const tasksInPeriod = tasks.filter(task => {
        const created = new Date(task.created_at);
        return created >= currentPeriodRange.start && created <= currentPeriodRange.end;
    });
    
    // Calcular custo total apenas de freelancers
    const periodFreelancerTotal = tasksInPeriod
        .filter(t => freelancers.some(f => f.id === t.designer_id))
        .reduce((sum, task) => sum + task.value, 0);
        
    const totalPeriodSpend = periodFreelancerTotal;
    const completedTasksInPeriod = tasksInPeriod.length;
    
    return { freelancerReports, totalPeriodSpend, periodFreelancerTotal, completedTasksInPeriod };
  }, [designers, tasks, advances, currentPeriodRange, periodType]);

  // Memoized data for the specific designer view
  const selectedDesignerData = useMemo(() => {
    if (selectedDesignerId === 'overview') return null;
    const designer = designers.find(d => d.id === selectedDesignerId);
    if (!designer) return null;
    
    let stats = {};
    let recentTasks: Task[] = [];
    let recentAdvances: Advance[] = [];
    const paymentHistory = calculateWeeklyPaymentHistory(designer.id, tasks, advances);

    // Lógica exclusiva para Freelancer - usando o período selecionado
    const tasksInPeriod = tasks.filter(task => 
        task.designer_id === designer.id &&
        new Date(task.created_at) >= currentPeriodRange.start &&
        new Date(task.created_at) <= currentPeriodRange.end
    );
    const taskTotal = tasksInPeriod.reduce((sum, task) => sum + task.value, 0);
    const advancesInPeriod = advances.filter(adv =>
        adv.designer_id === designer.id &&
        new Date(adv.date) >= currentPeriodRange.start &&
        new Date(adv.date) <= currentPeriodRange.end
    );
    const advancesTotal = advancesInPeriod.reduce((sum, adv) => sum + adv.amount, 0);
    const totalPayment = taskTotal - advancesTotal;
    recentTasks = tasksInPeriod;
    recentAdvances = advancesInPeriod;

    const periodLabel = periodType === 'week' ? 'Semana' : periodType === 'month' ? 'Mês' : 'Ano';
    stats = {
        [`Produzido (${periodLabel})`]: formatCurrency(taskTotal),
        [`Adiantamentos (${periodLabel})`]: `-${formatCurrency(advancesTotal)}`,
        [`A Pagar (${periodLabel})`]: formatCurrency(totalPayment),
        [`Demandas (${periodLabel})`]: recentTasks.length.toString(),
    };
    
    return { designer, stats, recentTasks, recentAdvances, paymentHistory };
  }, [selectedDesignerId, designers, tasks, advances, currentPeriodRange, periodType]);

  const getPeriodLabel = () => {
    if (periodType === 'week') return 'Semana';
    if (periodType === 'month') return 'Mês';
    return 'Ano';
  };

  const renderOverview = () => {
    const periodLabel = getPeriodLabel();
    return (
      <div className="space-y-8" id="print-area">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
          <StatCard title={`Gasto Total (${periodLabel})`} value={formatCurrency(overviewData.totalPeriodSpend)} icon={<CreditCardIcon className="text-brand-primary" />} />
          <StatCard title={`Custo Freelas (${periodLabel})`} value={formatCurrency(overviewData.periodFreelancerTotal)} icon={<MoneyIcon className="text-brand-primary" />} />
          <StatCard title={`Demandas Concluídas (${periodLabel})`} value={overviewData.completedTasksInPeriod.toString()} icon={<CheckCircleIcon className="text-brand-primary" />} />
        </div>

        {isDirector && (
          <div className="bg-base-100 p-6 rounded-2xl shadow-md">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div>
                <h3 className="text-xl font-bold mb-2 text-base-content">Pagamentos - Freelancers</h3>
                <p className="text-sm text-base-content-secondary">Período: {formatDate(toLocalDateString(currentPeriodRange.start))} a {formatDate(toLocalDateString(currentPeriodRange.end))}</p>
              </div>
              <select
                value={periodType}
                onChange={e => setPeriodType(e.target.value as PeriodType)}
                className="p-2 border rounded-lg bg-base-100 border-base-300 focus:ring-brand-primary focus:border-brand-primary"
              >
                <option value="week">Semana</option>
                <option value="month">Mês</option>
                <option value="year">Ano</option>
              </select>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b-2 border-base-300">
                        <tr>
                            <th className="p-3">Designer</th>
                            <th className="p-3">Produzido</th>
                            <th className="p-3">Adiantamentos</th>
                            <th className="p-3 font-bold">Total a Pagar</th>
                        </tr>
                    </thead>
                    <tbody>
                        {overviewData.freelancerReports.map(report => {
                            return (
                            <tr key={report.designer.id} className="border-b border-base-300/50">
                                <td className="p-3 font-semibold">{report.designer.name}</td>
                                <td className="p-3 text-green-400">{formatCurrency(report.taskTotal)}</td>
                                <td className="p-3 text-yellow-400">-{formatCurrency(report.advancesTotal)}</td>
                                <td className="p-3 font-bold text-brand-primary">{formatCurrency(report.totalPayment)}</td>
                            </tr>
                        )})}
                    </tbody>
                </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDesignerDetail = () => {
    if (!selectedDesignerData) {
      return (
        <div className="bg-base-100 p-8 rounded-2xl text-center">
            <p className="text-base-content-secondary">Designer não encontrado. Selecione outro na lista.</p>
        </div>
      );
    }
    const { designer, stats, recentTasks, paymentHistory } = selectedDesignerData;
    const periodLabel = getPeriodLabel();

    return (
      <div className="space-y-8" id="print-area">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(stats).map(([key, value]) => (
                <div key={key} className="bg-base-100 p-6 rounded-2xl shadow-md">
                    <p className="text-sm text-base-content-secondary">{key}</p>
                    <p className="text-2xl font-bold text-base-content">{value}</p>
                </div>
            ))}
        </div>
        
        <div className="bg-base-100 p-6 rounded-2xl shadow-md">
          <h3 className="text-xl font-bold mb-4 text-base-content">Demandas Recentes ({periodLabel})</h3>
          <div className="overflow-x-auto">
            {recentTasks.length > 0 ? (
                <table className="w-full text-left text-sm">
                    <thead className="border-b-2 border-base-300">
                      <tr>
                        <th className="p-2">Mídia</th>
                        <th className="p-2">Entrega</th>
                        <th className="p-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTasks.map(task => (
                        <tr key={task.id} className="border-b border-base-300/50">
                          <td className="p-2">{task.media_type}</td>
                          <td className="p-2">{formatDate(task.due_date)}</td>
                          <td className="p-2 text-right font-medium">{formatCurrency(task.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                </table>
            ) : <p className="text-base-content-secondary text-center py-4">Nenhuma demanda neste período.</p>}
          </div>
        </div>

        {paymentHistory.length > 0 && (
             <div className="bg-base-100 p-6 rounded-2xl shadow-md">
                <h3 className="text-xl font-bold mb-4 text-base-content">Histórico de Pagamentos Semanais</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b-2 border-base-300">
                            <tr>
                                <th className="p-3 font-semibold text-base-content-secondary">Período</th>
                                <th className="p-3 font-semibold text-base-content-secondary text-right">Valor Pago</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paymentHistory.map(entry => (
                                <tr key={entry.range.start.toISOString()} className="border-b border-base-300/50">
                                    <td className="p-3">{formatDate(entry.range.start.toISOString())} - {formatDate(entry.range.end.toISOString())}</td>
                                    <td className={`p-3 font-semibold text-right ${entry.total >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(entry.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </div>
    );
  };
  

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold text-base-content">
          {selectedDesignerId !== 'overview' && selectedDesignerData ? `Análise: ${selectedDesignerData.designer.name}` : (isDirector ? 'Dashboard do Diretor' : 'Painel Financeiro')}
        </h2>
        <div className="flex items-center gap-4 no-print">
          <select
            value={selectedDesignerId}
            onChange={e => setSelectedDesignerId(e.target.value)}
            className="p-2 border rounded-lg bg-base-100 border-base-300 focus:ring-brand-primary focus:border-brand-primary"
          >
            <option value="overview">Visão Geral</option>
            {designers
                .filter(d => d.type === DesignerType.Freelancer)
                .sort((a,b) => a.name.localeCompare(b.name))
                .map(d => <option key={d.id} value={d.id}>{d.name}</option>
            )}
          </select>
           <button onClick={() => window.print()} className="flex items-center bg-brand-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-secondary transition-colors shadow-sm">
              <PrinterIcon />
              <span className="ml-2">Imprimir</span>
           </button>
        </div>
      </div>
      
      {selectedDesignerId === 'overview' ? renderOverview() : renderDesignerDetail()}
    </div>
  );
};


const DesignerDashboard: React.FC<Pick<DashboardViewProps, 'tasks' | 'loggedInUser' | 'advances'>> = ({ tasks, loggedInUser, advances }) => {
    // Dashboard simplificado assumindo comportamento de Freelancer, já que Fixos não são mais o foco deste dashboard.
    const today = new Date();
    
    let paymentStatCard: React.ReactNode;
    let completedTasksStatCard: React.ReactNode;
    const periodLabel = 'esta Semana';
    let currentPeriodTasks: Task[] = [];

    const paymentHistory = calculateWeeklyPaymentHistory(loggedInUser.id, tasks, advances);

    const weekRange = getWeekRange(today);
    currentPeriodTasks = tasks.filter(task => {
        if (task.designer_id !== loggedInUser.id) return false;
        const created = new Date(task.created_at);
        return created >= weekRange.start && created <= weekRange.end;
    });
    const weeklyTaskTotal = currentPeriodTasks.reduce((sum, task) => sum + task.value, 0);

    const advancesInPeriod = advances.filter(adv =>
        adv.designer_id === loggedInUser.id &&
        new Date(adv.date) >= weekRange.start &&
        new Date(adv.date) <= weekRange.end
    );
    const advancesTotal = advancesInPeriod.reduce((sum, adv) => sum + adv.amount, 0);
    const weeklyPayment = weeklyTaskTotal - advancesTotal;

    paymentStatCard = <StatCard title="Pagamento da Semana" value={formatCurrency(weeklyPayment)} icon={<MoneyIcon className="text-brand-primary" />} />;
    completedTasksStatCard = <StatCard title="Demandas Concluídas (Semana)" value={currentPeriodTasks.length.toString()} icon={<CheckCircleIcon className="text-brand-primary" />} />;

    // Calculate Task Quantities Breakdown
    const taskBreakdown = useMemo(() => {
        return currentPeriodTasks.reduce((acc, task) => {
            acc[task.media_type] = (acc[task.media_type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }, [currentPeriodTasks]);


    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-base-content">Olá, {loggedInUser.name.split(' ')[0]}!</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paymentStatCard}
                {completedTasksStatCard}
                <div className="bg-base-100 p-6 rounded-2xl shadow-md h-full">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="bg-blue-500/10 p-2 rounded-full">
                             <CheckCircleIcon className="text-blue-500 h-5 w-5"/>
                        </div>
                        <h3 className="font-bold text-base-content">Resumo de Produção ({periodLabel})</h3>
                    </div>
                    {Object.keys(taskBreakdown).length > 0 ? (
                        <div className="space-y-2">
                             {Object.entries(taskBreakdown).map(([mediaType, count]) => (
                                <div key={mediaType} className="flex justify-between items-center bg-base-200/50 p-2 rounded-lg text-sm">
                                    <span className="text-base-content-secondary">{mediaType}</span>
                                    <span className="font-bold text-base-content badge badge-ghost">{count}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-base-content-secondary italic">Nenhuma demanda registrada ainda.</p>
                    )}
                </div>
            </div>

            {paymentHistory.length > 0 && (
                <div className="bg-base-100 p-6 rounded-2xl shadow-md">
                    <h3 className="text-xl font-bold mb-4 text-base-content">Histórico de Pagamentos Semanais</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b-2 border-base-300">
                                <tr>
                                    <th className="p-3 font-semibold text-base-content-secondary uppercase tracking-wider">Período</th>
                                    <th className="p-3 font-semibold text-base-content-secondary uppercase tracking-wider text-right">Valor Pago</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paymentHistory.map(entry => (
                                    <tr key={entry.range.start.toISOString()} className="border-b border-base-300/50">
                                        <td className="p-3 text-base-content-secondary align-top whitespace-nowrap">
                                            {formatDate(entry.range.start.toISOString())} - {formatDate(entry.range.end.toISOString())}
                                        </td>
                                        <td className={`p-3 font-semibold text-right align-top ${entry.total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {formatCurrency(entry.total)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="bg-base-100 p-6 rounded-2xl shadow-md">
                <h3 className="text-xl font-bold mb-4 text-base-content">Proposta p/ Designers 2025 (PHD)</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b-2 border-base-300">
                            <tr>
                                <th className="p-3 font-semibold text-base-content-secondary uppercase tracking-wider">Mídia</th>
                                <th className="p-3 font-semibold text-base-content-secondary uppercase tracking-wider">Descrição</th>
                                <th className="p-3 font-semibold text-base-content-secondary uppercase tracking-wider text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.values(MEDIA_PRICES).map(media => (
                                <tr key={media.name} className="border-b border-base-300/50">
                                    <td className="p-3 font-medium text-base-content align-top whitespace-nowrap">{media.name}</td>
                                    <td className="p-3 text-base-content-secondary text-sm">{media.description}</td>
                                    <td className="p-3 font-semibold text-base-content text-right align-top">{formatCurrency(media.price)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}


const DashboardView: React.FC<DashboardViewProps> = (props) => {
  const isDirector = props.loggedInUser.role === 'Diretor de Arte';
  const isFinancial = props.loggedInUser.role === 'Financeiro';

  if (isDirector || isFinancial) {
    return <UnifiedAdminDashboard {...props} />
  }
  
  return <DesignerDashboard {...props} />;
};

export default DashboardView;