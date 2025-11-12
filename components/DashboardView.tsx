import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Designer, Task, DesignerType, Advance } from '../types';
import { getWeekRange, getMonthRange, formatCurrency, formatDate, calculateWeeklyPaymentHistory, toLocalDateString } from '../utils/dateUtils';
import { MoneyIcon, UsersIcon, CheckCircleIcon, CreditCardIcon, ClockIcon, PrinterIcon, CheckIcon } from './icons/Icons';
import { MEDIA_PRICES } from '../constants';

interface DashboardViewProps {
  designers: Designer[];
  tasks: Task[];
  advances: Advance[];
  loggedInUser: Designer;
  submissionWindow: { isOpen: boolean; deadline: string | null };
  onToggleSubmissionWindow: () => void;
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-base-100 p-6 rounded-2xl shadow-md flex items-center space-x-4">
        <div className="bg-brand-primary/10 p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm text-base-content-secondary">{title}</p>
            <p className="text-2xl font-bold text-base-content">{value}</p>
        </div>
    </div>
);

const FinancialDashboard: React.FC<Omit<DashboardViewProps, 'loggedInUser' | 'submissionWindow' | 'onToggleSubmissionWindow'>> = ({ designers, tasks, advances }) => {
    const today = new Date();
    const weekRange = getWeekRange(today);
    const monthRange = getMonthRange(today);
    const [paidStatus, setPaidStatus] = useState<Record<string, boolean>>({});

    const actualDesigners = useMemo(() => designers.filter(d => d.type), [designers]);

    const freelancers = useMemo(() => actualDesigners.filter(d => d.type === DesignerType.Freelancer), [actualDesigners]);
    const fixedDesigners = useMemo(() => actualDesigners.filter(d => d.type === DesignerType.Fixed), [actualDesigners]);

    const freelancerReports = useMemo(() => freelancers.map(designer => {
        const tasksInPeriod = tasks.filter(task =>
            task.designer_id === designer.id &&
            new Date(task.created_at) >= weekRange.start &&
            new Date(task.created_at) <= weekRange.end
        );
        const taskTotal = tasksInPeriod.reduce((sum, task) => sum + task.value, 0);

        const advancesInPeriod = advances.filter(adv =>
            adv.designer_id === designer.id &&
            new Date(adv.date) >= weekRange.start &&
            new Date(adv.date) <= weekRange.end
        );
        const advancesTotal = advancesInPeriod.reduce((sum, adv) => sum + adv.amount, 0);

        const totalPayment = taskTotal - advancesTotal;
        const periodKey = `week-${toLocalDateString(weekRange.start)}`;
        return { designer, taskTotal, advancesTotal, totalPayment, periodKey };
    }), [freelancers, tasks, advances, weekRange]);

    const fixedReports = useMemo(() => fixedDesigners.map(designer => {
        const advancesInPeriod = advances.filter(adv =>
            adv.designer_id === designer.id &&
            new Date(adv.date) >= monthRange.start &&
            new Date(adv.date) <= monthRange.end
        );
        const advancesTotal = advancesInPeriod.reduce((sum, adv) => sum + adv.amount, 0);
        const totalPayment = (designer.salary || 0) - advancesTotal;
        const periodKey = `month-${monthRange.start.getFullYear()}-${monthRange.start.getMonth()}`;

        return { designer, salary: designer.salary || 0, advancesTotal, totalPayment, periodKey };
    }), [fixedDesigners, advances, monthRange]);

    const handleTogglePaid = (key: string) => {
        setPaidStatus(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
                <h2 className="text-3xl font-bold text-base-content">Painel Financeiro</h2>
                <button onClick={() => window.print()} className="flex items-center bg-brand-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-secondary transition-colors shadow-sm">
                    <PrinterIcon />
                    <span className="ml-2">Imprimir Relatórios</span>
                </button>
            </div>
            <div id="print-area" className="space-y-8">
                <div className="bg-base-100 p-6 rounded-2xl shadow-md">
                    <h3 className="text-xl font-bold mb-2 text-base-content">Pagamentos da Semana - Freelancers</h3>
                    <p className="text-sm text-base-content-secondary mb-4">Período: {formatDate(weekRange.start.toISOString())} a {formatDate(weekRange.end.toISOString())}</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b-2 border-base-300">
                                <tr>
                                    <th className="p-3">Designer</th>
                                    <th className="p-3">Produzido</th>
                                    <th className="p-3">Adiantamentos</th>
                                    <th className="p-3 font-bold">Total a Pagar</th>
                                    <th className="p-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {freelancerReports.filter(r => r.totalPayment !== 0 || r.taskTotal > 0).map(report => {
                                    const paymentKey = `${report.designer.id}-${report.periodKey}`;
                                    const isPaid = paidStatus[paymentKey];
                                    return (
                                    <tr key={report.designer.id} className="border-b border-base-300/50">
                                        <td className="p-3 font-semibold">{report.designer.name}</td>
                                        <td className="p-3 text-green-400">{formatCurrency(report.taskTotal)}</td>
                                        <td className="p-3 text-yellow-400">-{formatCurrency(report.advancesTotal)}</td>
                                        <td className="p-3 font-bold text-brand-primary">{formatCurrency(report.totalPayment)}</td>
                                        <td className="p-3 text-center">
                                            <label className="flex items-center justify-center cursor-pointer">
                                                <input type="checkbox" className="hidden" checked={isPaid} onChange={() => handleTogglePaid(paymentKey)} />
                                                <div className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${isPaid ? 'bg-green-500' : 'bg-base-300'}`}>
                                                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isPaid ? 'translate-x-6' : ''}`}></div>
                                                </div>
                                                <span className={`ml-2 text-sm font-semibold no-print ${isPaid ? 'text-green-400' : 'text-base-content-secondary'}`}>{isPaid ? 'Pago' : 'Pendente'}</span>
                                            </label>
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                </div>
                 <div className="bg-base-100 p-6 rounded-2xl shadow-md">
                    <h3 className="text-xl font-bold mb-2 text-base-content">Pagamentos do Mês - Equipe Fixa</h3>
                     <p className="text-sm text-base-content-secondary mb-4">Mês de Referência: {today.toLocaleString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</p>
                    <div className="overflow-x-auto">
                         <table className="w-full text-left">
                            <thead className="border-b-2 border-base-300">
                                <tr>
                                    <th className="p-3">Designer</th>
                                    <th className="p-3">Salário Base</th>
                                    <th className="p-3">Adiantamentos</th>
                                    <th className="p-3 font-bold">Total a Pagar</th>
                                    <th className="p-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fixedReports.map(report => {
                                    const paymentKey = `${report.designer.id}-${report.periodKey}`;
                                    const isPaid = paidStatus[paymentKey];
                                    return (
                                    <tr key={report.designer.id} className="border-b border-base-300/50">
                                        <td className="p-3 font-semibold">{report.designer.name}</td>
                                        <td className="p-3">{formatCurrency(report.salary)}</td>
                                        <td className="p-3 text-yellow-400">-{formatCurrency(report.advancesTotal)}</td>
                                        <td className="p-3 font-bold text-brand-primary">{formatCurrency(report.totalPayment)}</td>
                                        <td className="p-3 text-center">
                                             <label className="flex items-center justify-center cursor-pointer">
                                                <input type="checkbox" className="hidden" checked={isPaid} onChange={() => handleTogglePaid(paymentKey)} />
                                                <div className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${isPaid ? 'bg-green-500' : 'bg-base-300'}`}>
                                                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isPaid ? 'translate-x-6' : ''}`}></div>
                                                </div>
                                                <span className={`ml-2 text-sm font-semibold no-print ${isPaid ? 'text-green-400' : 'text-base-content-secondary'}`}>{isPaid ? 'Pago' : 'Pendente'}</span>
                                            </label>
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}

const DirectorDashboard: React.FC<Omit<DashboardViewProps, 'loggedInUser'>> = ({ designers, tasks, submissionWindow, onToggleSubmissionWindow }) => {
    const today = new Date();
    const weekRange = getWeekRange(today);
    const monthRange = getMonthRange(today);
    
    const freelancerTasksThisWeek = tasks.filter(task => {
        const designer = designers.find(d => d.id === task.designer_id);
        if (!designer || designer.type !== DesignerType.Freelancer) return false;
        const created = new Date(task.created_at);
        return created >= weekRange.start && created <= weekRange.end;
    });
    const weeklyFreelancerTotal = freelancerTasksThisWeek.reduce((sum, task) => sum + task.value, 0);

    const fixedDesigners = designers.filter(d => d.type === DesignerType.Fixed);
    const monthlyFixedTotal = fixedDesigners.reduce((sum, d) => sum + (d.salary || 0), 0);

    const freelancerTasksThisMonth = tasks.filter(task => {
        const designer = designers.find(d => d.id === task.designer_id);
        if (!designer || designer.type !== DesignerType.Freelancer) return false;
        const created = new Date(task.created_at);
        return created >= monthRange.start && created <= monthRange.end;
    });
    const monthlyFreelancerTotal = freelancerTasksThisMonth.reduce((sum, task) => sum + task.value, 0);

    const totalMonthlySpend = monthlyFixedTotal + monthlyFreelancerTotal;

    const designerMonthlyCostData = designers.filter(d => d.type).map(designer => {
        let cost = 0;
        if (designer.type === DesignerType.Fixed) {
            cost = designer.salary || 0;
        } else {
            cost = tasks
                .filter(task => task.designer_id === designer.id && new Date(task.created_at) >= monthRange.start && new Date(task.created_at) <= monthRange.end)
                .reduce((sum, task) => sum + task.value, 0);
        }
        return {
        name: designer.name.split(' ')[0], // First name
        custo: cost
        };
    }).filter(d => d.custo > 0);
    
    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-base-content">Dashboard</h2>

            <div className="bg-base-100 p-6 rounded-2xl shadow-md flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-base-content">Envio de Demandas da Semana</h3>
                    <p className={`text-sm ${submissionWindow.isOpen ? 'text-green-400' : 'text-yellow-400'}`}>
                        {submissionWindow.isOpen && submissionWindow.deadline 
                            ? `Aberto até ${new Date(submissionWindow.deadline).toLocaleString('pt-BR', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}` 
                            : 'Fechado'}
                    </p>
                </div>
                <button 
                    onClick={onToggleSubmissionWindow} 
                    className={`px-4 py-2 rounded-lg font-semibold text-white transition-colors shadow-sm w-full sm:w-auto ${submissionWindow.isOpen ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`}
                >
                    {submissionWindow.isOpen ? 'Fechar Envios' : 'Abrir Envios'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Pagamento Freelas (Semana)" value={formatCurrency(weeklyFreelancerTotal)} icon={<MoneyIcon className="text-brand-primary" />} />
                <StatCard title="Custo Fixo (Mês)" value={formatCurrency(monthlyFixedTotal)} icon={<UsersIcon className="text-brand-primary" />} />
                <StatCard title="Gasto Total (Mês)" value={formatCurrency(totalMonthlySpend)} icon={<CreditCardIcon className="text-brand-primary" />} />
                <StatCard title="Demandas Concluídas (Mês)" value={freelancerTasksThisMonth.length.toString()} icon={<CheckCircleIcon className="text-brand-primary" />} />
            </div>

            <div className="bg-base-100 p-6 rounded-2xl shadow-md">
                <h3 className="text-xl font-bold mb-4 text-base-content">Custos do Mês por Designer</h3>
                <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <BarChart data={designerMonthlyCostData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => formatCurrency(Number(value))} />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), 'Custo no Mês']} 
                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', color: '#F9FAFB' }}
                        />
                    <Legend />
                    <Bar dataKey="custo" fill="#DC2626" name="Custo Mensal" />
                    </BarChart>
                </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}

const DesignerDashboard: React.FC<Pick<DashboardViewProps, 'tasks' | 'loggedInUser' | 'submissionWindow' | 'advances'>> = ({ tasks, loggedInUser, submissionWindow, advances }) => {
    const isFixed = loggedInUser.type === DesignerType.Fixed;
    const today = new Date();
    
    let paymentStatCard: React.ReactNode;
    let completedTasksStatCard: React.ReactNode;
    const paymentHistory = loggedInUser.type === DesignerType.Freelancer
        ? calculateWeeklyPaymentHistory(loggedInUser.id, tasks, advances)
        : [];

    if (isFixed) {
        const monthRange = getMonthRange(today);
        const myTasksThisMonth = tasks.filter(task => {
            if (task.designer_id !== loggedInUser.id) return false;
            const created = new Date(task.created_at);
            return created >= monthRange.start && created <= monthRange.end;
        });

        const advancesInPeriod = advances.filter(adv =>
            adv.designer_id === loggedInUser.id &&
            new Date(adv.date) >= monthRange.start &&
            new Date(adv.date) <= monthRange.end
        );
        const advancesTotal = advancesInPeriod.reduce((sum, adv) => sum + adv.amount, 0);
        const finalPayment = (loggedInUser.salary || 0) - advancesTotal;
        
        paymentStatCard = <StatCard title="Pagamento a Receber (Mês)" value={formatCurrency(finalPayment)} icon={<MoneyIcon className="text-brand-primary" />} />;
        completedTasksStatCard = <StatCard title="Demandas Concluídas (Mês)" value={myTasksThisMonth.length.toString()} icon={<CheckCircleIcon className="text-brand-primary" />} />;
    } else { // Freelancer
        const weekRange = getWeekRange(today);
        const myTasksThisWeek = tasks.filter(task => {
            if (task.designer_id !== loggedInUser.id) return false;
            const created = new Date(task.created_at);
            return created >= weekRange.start && created <= weekRange.end;
        });
        const weeklyTaskTotal = myTasksThisWeek.reduce((sum, task) => sum + task.value, 0);

        const advancesInPeriod = advances.filter(adv =>
            adv.designer_id === loggedInUser.id &&
            new Date(adv.date) >= weekRange.start &&
            new Date(adv.date) <= weekRange.end
        );
        const advancesTotal = advancesInPeriod.reduce((sum, adv) => sum + adv.amount, 0);
        const weeklyPayment = weeklyTaskTotal - advancesTotal;

        paymentStatCard = <StatCard title="Pagamento da Semana" value={formatCurrency(weeklyPayment)} icon={<MoneyIcon className="text-brand-primary" />} />;
        completedTasksStatCard = <StatCard title="Demandas Concluídas (Semana)" value={myTasksThisWeek.length.toString()} icon={<CheckCircleIcon className="text-brand-primary" />} />;
    }

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-base-content">Olá, {loggedInUser.name.split(' ')[0]}!</h2>
            
            <div className={`p-6 rounded-2xl shadow-md flex items-center space-x-4 ${submissionWindow.isOpen ? 'bg-green-900/50 border border-green-500' : 'bg-yellow-900/50 border border-yellow-500'}`}>
                <div className={`p-3 rounded-full ${submissionWindow.isOpen ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
                    <ClockIcon className={submissionWindow.isOpen ? 'text-green-400' : 'text-yellow-400'} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-base-content">Envio de Demandas</h3>
                    {submissionWindow.isOpen && submissionWindow.deadline ? (
                         <p className="text-green-300">O período para enviar suas demandas e garantir o pagamento está aberto! O prazo final é <strong>{new Date(submissionWindow.deadline).toLocaleString('pt-BR', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}</strong>.</p>
                    ) : (
                        <p className="text-yellow-300">O período para enviar demandas está fechado. Aguarde o diretor abrir o sistema na sexta-feira.</p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paymentStatCard}
                {completedTasksStatCard}
            </div>

            {loggedInUser.type === DesignerType.Freelancer && paymentHistory.length > 0 && (
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

            {loggedInUser.type === DesignerType.Freelancer && (
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
            )}
        </div>
    )
}


const DashboardView: React.FC<DashboardViewProps> = (props) => {
  const isDirector = props.loggedInUser.role === 'Diretor de Arte';
  const isFinancial = props.loggedInUser.role === 'Financeiro';

  if (isDirector) {
    return <DirectorDashboard {...props} />
  }

  if (isFinancial) {
    return <FinancialDashboard {...props} />
  }
  
  return <DesignerDashboard {...props} />;
};

export default DashboardView;