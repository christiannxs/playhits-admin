import React, { useState, useMemo } from 'react';
import { Designer, Task, Advance } from '../types';
import { PresentationChartBarIcon, ClockIcon } from './icons/Icons';
import { getWeekRange, toLocalDateString, getTaskDueDateAsDate, getWeekKey, getPreviousWeekKey, getNextWeekKey, formatDate } from '../utils/dateUtils';

interface ReportsViewProps {
  designers: Designer[];
  tasks: Task[];
  advances: Advance[];
  loggedInUser: Designer;
}

/** Extrai "Solicitante: X" do campo description, se existir. */
function parseSolicitanteFromDescription(description: string | null | undefined): string {
  if (!description || typeof description !== 'string') return '—';
  const match = description.match(/\|\s*Solicitante:\s*(.+?)(?:\s*\||$)/i) || description.match(/Solicitante:\s*(.+?)(?:\s*\||$)/i);
  return match ? match[1].trim() : '—';
}

/** Título da demanda: description sem o trecho "| Solicitante: ...". */
function getTituloFromDescription(description: string | null | undefined): string {
  if (!description || typeof description !== 'string') return '—';
  return description.replace(/\|\s*Solicitante:.*$/i, '').trim() || '—';
}

const ReportsView: React.FC<ReportsViewProps> = ({ loggedInUser, tasks = [], designers = [] }) => {
  const isDirectorOrFinancial = loggedInUser?.role === 'Diretor de Arte' || loggedInUser?.role === 'Financeiro';

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeDesigners = Array.isArray(designers) ? designers : [];
  const designerMap = useMemo(() => new Map(safeDesigners.map(d => [d.id, d.name])), [safeDesigners]);

  const tasksByWeek = useMemo(() => {
    const map = new Map<string, { range: { start: Date; end: Date }; tasks: Task[] }>();
    safeTasks.forEach(task => {
      try {
        const refDate = getTaskDueDateAsDate(task.due_date);
        if (!refDate) return;
        const weekRange = getWeekRange(refDate);
        const weekKey = toLocalDateString(weekRange.start);
        if (!map.has(weekKey)) {
          map.set(weekKey, { range: weekRange, tasks: [] });
        }
        map.get(weekKey)!.tasks.push(task);
      } catch {
        // ignorar tarefa com data inválida
      }
    });
    map.forEach(entry => {
      entry.tasks.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
    });
    return map;
  }, [safeTasks]);

  const availableWeekKeys = useMemo(() => {
    let currentWeekKey: string;
    try {
      currentWeekKey = getWeekKey(new Date());
    } catch {
      currentWeekKey = new Date().toISOString().slice(0, 10);
    }
    const keys = new Set(tasksByWeek.keys());
    keys.add(currentWeekKey);
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [tasksByWeek]);

  const [selectedWeekKey, setSelectedWeekKey] = useState<string>(() => {
    try {
      return getWeekKey(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  });

  const weekOptionsForSelect = useMemo(() => {
    const set = new Set(availableWeekKeys);
    if (!set.has(selectedWeekKey)) set.add(selectedWeekKey);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [availableWeekKeys, selectedWeekKey]);

  const selectedWeekData = tasksByWeek.get(selectedWeekKey);
  const selectedWeekRange = selectedWeekData?.range ?? (() => {
    try {
      return getWeekRange(new Date());
    } catch {
      const n = new Date();
      const start = new Date(n);
      start.setDate(n.getDate() - n.getDay() - 1);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start, end };
    }
  })();

  const weekLabel = `${formatDate(toLocalDateString(selectedWeekRange.start))} a ${formatDate(toLocalDateString(selectedWeekRange.end))}`;
  const tasksForWeek = selectedWeekData?.tasks ?? [];

  return (
    <div className="min-h-0 flex flex-col">
      <header className="flex-shrink-0 pb-6 no-print">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-base-content flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-primary/12 text-brand-primary ring-1 ring-brand-primary/20">
              <PresentationChartBarIcon className="h-6 w-6" />
            </span>
            Relatórios
          </h1>
          <p className="text-sm text-base-content-secondary mt-2 max-w-md">
            Relatório por semana (sábado a sexta) com base nas demandas cadastradas. Pesquise semanas anteriores pelo seletor.
          </p>
        </div>
      </header>

      <div id="print-area" className="flex-1 space-y-8 overflow-auto">

        {isDirectorOrFinancial && (
          <section className="bg-base-100 rounded-2xl border border-base-300/50 overflow-hidden shadow-sm">
            <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-base-300/60 bg-base-200/40">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-primary/15 text-brand-primary ring-1 ring-brand-primary/20">
                <ClockIcon className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-base-content">Relatório por semana</h2>
                <p className="text-xs text-base-content-secondary">Demandas agrupadas por semana (sábado a sexta). Selecione a semana desejada.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedWeekKey(getPreviousWeekKey(selectedWeekKey))}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-base-200 hover:bg-base-300 text-base-content font-medium transition-colors text-sm"
                  title="Semana anterior"
                >
                  <span aria-hidden>←</span> Anterior
                </button>
                <select
                  value={selectedWeekKey}
                  onChange={e => setSelectedWeekKey(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-base-200 border border-base-300 text-base-content focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary outline-none text-sm min-w-[180px]"
                  title="Selecione a semana"
                >
                  {weekOptionsForSelect.map(key => {
                    const data = tasksByWeek.get(key);
                    const range = data?.range ?? getWeekRange(new Date(`${key}T12:00:00.000-03:00`));
                    const label = `${toLocalDateString(range.start)} a ${toLocalDateString(range.end)}`;
                    const count = data?.tasks.length ?? 0;
                    return (
                      <option key={key} value={key}>
                        {label} {count > 0 ? `(${count} demanda${count !== 1 ? 's' : ''})` : ''}
                      </option>
                    );
                  })}
                </select>
                <button
                  type="button"
                  onClick={() => setSelectedWeekKey(getNextWeekKey(selectedWeekKey))}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-base-200 hover:bg-base-300 text-base-content font-medium transition-colors text-sm"
                  title="Próxima semana"
                >
                  Próxima <span aria-hidden>→</span>
                </button>
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm text-base-content-secondary mb-4">
                <strong>Semana:</strong> {weekLabel}
                {tasksForWeek.length > 0 && (
                  <span className="ml-2">({tasksForWeek.length} demanda{tasksForWeek.length !== 1 ? 's' : ''})</span>
                )}
              </p>
              {tasksForWeek.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-base-300/50">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-base-200/60 border-b border-base-300">
                        <th className="px-4 py-3 font-semibold text-base-content-secondary">Título</th>
                        <th className="px-4 py-3 font-semibold text-base-content-secondary">Artista</th>
                        <th className="px-4 py-3 font-semibold text-base-content-secondary">Design</th>
                        <th className="px-4 py-3 font-semibold text-base-content-secondary">Solicitante</th>
                        <th className="px-4 py-3 font-semibold text-base-content-secondary">Tag</th>
                        <th className="px-4 py-3 font-semibold text-base-content-secondary">Data</th>
                        <th className="px-4 py-3 font-semibold text-base-content-secondary">Quantidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasksForWeek.map(task => (
                        <tr key={task.id} className="border-b border-base-300/30 hover:bg-base-200/30 last:border-b-0">
                          <td className="px-4 py-3 text-base-content">{getTituloFromDescription(task.description)}</td>
                          <td className="px-4 py-3 text-base-content-secondary">{task.artist || '—'}</td>
                          <td className="px-4 py-3 text-base-content-secondary">{designerMap.get(task.designer_id) || '—'}</td>
                          <td className="px-4 py-3 text-base-content-secondary">{parseSolicitanteFromDescription(task.description)}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-base-300/60 text-xs font-medium text-base-content">
                              {task.media_type || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-base-content-secondary">{formatDate(task.due_date)}</td>
                          <td className="px-4 py-3 text-base-content-secondary">1</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-base-content-secondary text-sm py-6 text-center rounded-xl bg-base-200/40 border border-base-300/40">
                  Nenhuma demanda nesta semana. Selecione outra semana ou cadastre demandas na aba Demandas.
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ReportsView;
