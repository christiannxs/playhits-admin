import React, { useState, useMemo, useCallback } from 'react';
import { Designer, Task, Advance, DesignerType } from '../types';
import { PresentationChartBarIcon, ClockIcon } from './icons/Icons';
import { getWeekRange, toLocalDateString, getTaskDueDateAsDate, getWeekKey, getPreviousWeekKey, getNextWeekKey, formatDate, getTaskPayableValue, formatCurrency } from '../utils/dateUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logophd from '../images/logophd.png';

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

/** Agrupa tarefas por designer_id; retorna array de { designerId, designerName, tasks } ordenado por nome do design. */
function groupTasksByDesigner(tasks: Task[], designerMap: Map<string, string>): { designerId: string; designerName: string; tasks: Task[] }[] {
  const byId = new Map<string, Task[]>();
  tasks.forEach(task => {
    const id = task.designer_id || '__sem_design__';
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id)!.push(task);
  });
  return Array.from(byId.entries())
    .map(([designerId, taskList]) => ({
      designerId,
      designerName: designerMap.get(designerId) || 'Sem design',
      tasks: taskList.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '')),
    }))
    .sort((a, b) => a.designerName.localeCompare(b.designerName));
}

type TopEntry = { name: string; count: number };

/** Calcula resumo completo a partir do relatório: totais, status, por mídia, tops (solicitante, artista, design). */
function buildReportSummary(tasks: Task[], designerMap: Map<string, string>) {
  const solicitanteCount = new Map<string, number>();
  const artistCount = new Map<string, number>();
  const designerCount = new Map<string, number>();
  const mediaTypeCount = new Map<string, number>();
  let totalAprovadas = 0;
  let totalReprovadas = 0;

  tasks.forEach(task => {
    const sol = parseSolicitanteFromDescription(task.description);
    if (sol && sol !== '—') solicitanteCount.set(sol, (solicitanteCount.get(sol) ?? 0) + 1);
    const artist = (task.artist || '').trim() || '—';
    if (artist !== '—') artistCount.set(artist, (artistCount.get(artist) ?? 0) + 1);
    const name = designerMap.get(task.designer_id) || '—';
    designerCount.set(name, (designerCount.get(name) ?? 0) + 1);
    const media = (task.media_type || '').trim() || '—';
    mediaTypeCount.set(media, (mediaTypeCount.get(media) ?? 0) + 1);
    if (task.approval_status === 'rejected') totalReprovadas += 1;
    else totalAprovadas += 1;
  });

  const topN = <T extends [string, number]>(entries: T[], n: number, excludeNames?: string[]): TopEntry[] => {
    const exclude = new Set((excludeNames ?? []).map(s => s.trim().toLowerCase()));
    const filtered = entries.filter(([name]) => !exclude.has((name || '').trim().toLowerCase()));
    return filtered.sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, count]) => ({ name, count }));
  };

  const topSolicitantes = topN(Array.from(solicitanteCount.entries()), 3, ['—', '-', '']);
  const topArtists = topN(Array.from(artistCount.entries()), 3, ['—', '-', '']);
  const topDesigners = topN(Array.from(designerCount.entries()), 3, ['—', '-', '', 'sem design']);
  const byMediaType = Array.from(mediaTypeCount.entries())
    .filter(([label]) => (label || '').trim() && label !== '—' && label !== '-')
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  return {
    totalDemandas: tasks.length,
    totalAprovadas,
    totalReprovadas,
    numDesigners: designerCount.size,
    byMediaType,
    topSolicitantes,
    topArtists,
    topDesigners,
    topSolicitante: topSolicitantes[0] ?? null,
    topArtist: topArtists[0] ?? null,
    topDesigner: topDesigners[0] ?? null,
  };
}

const ReportsView: React.FC<ReportsViewProps> = ({ loggedInUser, tasks = [], designers = [] }) => {
  const isDirectorOrFinancial = loggedInUser?.role === 'Diretor de Arte' || loggedInUser?.role === 'Financeiro';

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeDesigners = Array.isArray(designers) ? designers : [];
  const designerMap = useMemo(() => new Map(safeDesigners.map(d => [d.id, d.name])), [safeDesigners]);
  const fixedDesignerIds = useMemo(() => new Set(safeDesigners.filter(d => d.type === DesignerType.Fixed).map(d => d.id)), [safeDesigners]);

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

  const tasksByDesigner = useMemo(() => groupTasksByDesigner(tasksForWeek, designerMap), [tasksForWeek, designerMap]);
  const tasksByDesignerWithTotal = useMemo(() => {
    return tasksByDesigner.map(group => {
      const isFixed = fixedDesignerIds.has(group.designerId);
      const totalValue = isFixed ? null : group.tasks.reduce((sum, t) => sum + getTaskPayableValue(t), 0);
      return { ...group, totalValue };
    });
  }, [tasksByDesigner, fixedDesignerIds]);
  const reportSummary = useMemo(() => buildReportSummary(tasksForWeek, designerMap), [tasksForWeek, designerMap]);

  const handleExportPdf = useCallback(async () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = doc.getPageWidth();
    const margin = 14;
    let y = 20;

    const addLogo = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const dataUrl = canvas.toDataURL('image/png');
              const logoW = 45;
              const logoH = Math.min(18, (img.naturalHeight / img.naturalWidth) * logoW);
              doc.addImage(dataUrl, 'PNG', margin, 10, logoW, logoH);
            }
          } catch (e) {
            reject(e);
          }
          resolve();
        };
        img.onerror = () => resolve();
        img.src = logophd;
      });
    };

    await addLogo();
    y = 32;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de demandas', margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Semana: ${weekLabel}`, margin, y);
    y += 8;

    if (tasksForWeek.length === 0) {
      doc.text('Nenhuma demanda nesta semana.', margin, y);
      doc.save(`relatorio-${selectedWeekKey}.pdf`);
      return;
    }

    const head = [['Título', 'Artista', 'Solicitante', 'Tag', 'Data', 'Status']];

    for (const group of tasksByDesignerWithTotal) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Design: ${group.designerName}`, margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      if (group.totalValue !== null) {
        doc.text(`Valor total (semana): ${formatCurrency(group.totalValue)}`, margin, y);
      } else {
        doc.text('Fixo (não entra no cálculo financeiro)', margin, y);
      }
      y += 7;

      const body = group.tasks.map(t => [
        getTituloFromDescription(t.description).slice(0, 35),
        (t.artist || '—').slice(0, 20),
        parseSolicitanteFromDescription(t.description).slice(0, 18),
        (t.media_type || '—').slice(0, 12),
        formatDate(t.due_date),
        t.approval_status === 'rejected' ? 'Reprovada' : 'Aprovada',
      ]);

      autoTable(doc, {
        startY: y,
        head,
        body,
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: { fillColor: [42, 46, 56], fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 28 },
          2: { cellWidth: 28 },
          3: { cellWidth: 22 },
          4: { cellWidth: 22 },
          5: { cellWidth: 20 },
        },
      });
      const docWithTable = doc as unknown as { lastAutoTable?: { finalY: number } };
      y = (docWithTable.lastAutoTable?.finalY ?? y) + 10;
    }

    doc.addPage();
    y = 20;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo do relatório', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Dados consolidados de todas as demandas desta semana (sábado a sexta).', margin, y);
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Visão geral', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Total de demandas: ${reportSummary.totalDemandas} (${reportSummary.totalAprovadas} aprovadas${reportSummary.totalReprovadas > 0 ? `, ${reportSummary.totalReprovadas} reprovadas` : ''})`, margin, y);
    y += 6;
    doc.text(`Designers envolvidos: ${reportSummary.numDesigners}`, margin, y);
    y += 10;

    if (reportSummary.topSolicitante || reportSummary.topArtist || reportSummary.topDesigner) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Destaques', margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      if (reportSummary.topSolicitante) {
        doc.text(`Solicitante que mais fez demanda: ${reportSummary.topSolicitante.name} (${reportSummary.topSolicitante.count} demanda${reportSummary.topSolicitante.count !== 1 ? 's' : ''})`, margin, y);
        y += 6;
      }
      if (reportSummary.topArtist) {
        doc.text(`Artista que mais teve demanda: ${reportSummary.topArtist.name} (${reportSummary.topArtist.count} demanda${reportSummary.topArtist.count !== 1 ? 's' : ''})`, margin, y);
        y += 6;
      }
      if (reportSummary.topDesigner) {
        doc.text(`Design que mais atendeu: ${reportSummary.topDesigner.name} (${reportSummary.topDesigner.count} demanda${reportSummary.topDesigner.count !== 1 ? 's' : ''})`, margin, y);
        y += 6;
      }
      y += 4;
    }

    if (reportSummary.topSolicitantes.length > 1 || reportSummary.topArtists.length > 1 || reportSummary.topDesigners.length > 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Ranking (top 3)', margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      if (reportSummary.topSolicitantes.length > 0) {
        doc.text('Solicitantes:', margin, y);
        reportSummary.topSolicitantes.forEach((s, i) => {
          y += 5;
          doc.text(`${i + 1}. ${s.name} (${s.count})`, margin + 4, y);
        });
        y += 4;
      }
      if (reportSummary.topArtists.length > 0) {
        doc.text('Artistas mais demandados:', margin, y);
        reportSummary.topArtists.forEach((a, i) => {
          y += 5;
          doc.text(`${i + 1}. ${a.name} (${a.count})`, margin + 4, y);
        });
        y += 4;
      }
      if (reportSummary.topDesigners.length > 0) {
        doc.text('Designs que mais atenderam:', margin, y);
        reportSummary.topDesigners.forEach((d, i) => {
          y += 5;
          doc.text(`${i + 1}. ${d.name} (${d.count})`, margin + 4, y);
        });
        y += 4;
      }
    }

    if (reportSummary.byMediaType.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Demandas por tipo de mídia (tag)', margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      reportSummary.byMediaType.forEach(({ label, count }) => {
        doc.text(`• ${label}: ${count}`, margin, y);
        y += 5;
      });
    }

    doc.save(`relatorio-${selectedWeekKey}.pdf`);
  }, [weekLabel, selectedWeekKey, tasksForWeek, tasksByDesignerWithTotal, reportSummary]);

  return (
    <div className="min-h-0 flex flex-col">
      <header className="page-header flex-shrink-0 no-print">
        <div>
          <h1 className="page-header-title flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-primary/12 text-brand-primary ring-1 ring-brand-primary/20">
              <PresentationChartBarIcon className="h-6 w-6" />
            </span>
            Relatórios
          </h1>
          <p className="page-header-subtitle max-w-md">
            Relatório por semana (sábado a sexta) com base nas demandas cadastradas. Pesquise semanas anteriores pelo seletor.
          </p>
        </div>
      </header>

      <div id="print-area" className="flex-1 space-y-8 overflow-auto">
        {isDirectorOrFinancial && (
          <section className="section-card bg-base-100 rounded-2xl overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-base-300/60 bg-base-200/40">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-primary/15 text-brand-primary ring-1 ring-brand-primary/20">
                <ClockIcon className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-base-content">Relatório por semana</h2>
                <p className="text-xs text-base-content-secondary">Demandas agrupadas por design. Selecione a semana desejada.</p>
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
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-secondary text-white font-medium transition-colors text-sm shadow-sm"
                  title="Exportar relatório em PDF"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar PDF
                </button>
              </div>
            </div>

            <div className="p-5 space-y-6">
              <p className="text-sm text-base-content-secondary">
                <strong>Semana:</strong> {weekLabel}
                {tasksForWeek.length > 0 && (
                  <span className="ml-2">({tasksForWeek.length} demanda{tasksForWeek.length !== 1 ? 's' : ''})</span>
                )}
              </p>

              {tasksForWeek.length > 0 ? (
                <>
                  {tasksByDesignerWithTotal.map(({ designerName, tasks: designerTasks, totalValue }) => (
                    <div
                      key={designerName}
                      className="rounded-2xl border border-base-300/50 overflow-hidden bg-base-200/30"
                    >
                      <div className="px-4 py-3 border-b border-base-300/50 bg-base-300/30">
                        <h3 className="text-base font-bold text-base-content">Design: {designerName}</h3>
                        <p className="text-xs text-base-content-secondary mt-0.5">
                          {designerTasks.length} demanda{designerTasks.length !== 1 ? 's' : ''} nesta semana
                          {totalValue !== null && (
                            <span className="ml-2 font-semibold text-base-content">
                              · Valor total: {formatCurrency(totalValue)}
                            </span>
                          )}
                          {totalValue === null && (
                            <span className="ml-2 text-base-content-secondary">· Fixo (não entra no cálculo financeiro)</span>
                          )}
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="bg-base-200/60 border-b border-base-300">
                              <th className="px-4 py-3 font-semibold text-base-content-secondary">Título</th>
                              <th className="px-4 py-3 font-semibold text-base-content-secondary">Artista</th>
                              <th className="px-4 py-3 font-semibold text-base-content-secondary">Solicitante</th>
                              <th className="px-4 py-3 font-semibold text-base-content-secondary">Tag</th>
                              <th className="px-4 py-3 font-semibold text-base-content-secondary">Data</th>
                              <th className="px-4 py-3 font-semibold text-base-content-secondary">Quantidade</th>
                              <th className="px-4 py-3 font-semibold text-base-content-secondary">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {designerTasks.map(task => {
                              const isRejected = task.approval_status === 'rejected';
                              return (
                                <tr key={task.id} className="border-b border-base-300/30 hover:bg-base-200/30 last:border-b-0">
                                  <td className="px-4 py-3 text-base-content">{getTituloFromDescription(task.description)}</td>
                                  <td className="px-4 py-3 text-base-content-secondary">{task.artist || '—'}</td>
                                  <td className="px-4 py-3 text-base-content-secondary">{parseSolicitanteFromDescription(task.description)}</td>
                                  <td className="px-4 py-3">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-base-300/60 text-xs font-medium text-base-content">
                                      {task.media_type || '—'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-base-content-secondary">{formatDate(task.due_date)}</td>
                                  <td className="px-4 py-3 text-base-content-secondary">1</td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${isRejected ? 'bg-red-500/15 text-red-600 dark:text-red-400' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'}`}>
                                      {isRejected ? 'Reprovada' : 'Aprovada'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}

                  <div className="rounded-2xl border border-base-300/50 bg-base-200/40 p-5 space-y-5">
                    <div>
                      <h3 className="text-base font-bold text-base-content mb-1">Resumo do relatório</h3>
                      <p className="text-xs text-base-content-secondary">
                        Dados consolidados de todas as demandas desta semana (sábado a sexta). Valores calculados a partir do relatório completo acima.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="rounded-xl bg-base-300/30 border border-base-300/40 p-3">
                        <p className="text-xs font-medium text-base-content-secondary uppercase tracking-wide">Total de demandas</p>
                        <p className="text-xl font-bold text-base-content mt-0.5">{reportSummary.totalDemandas}</p>
                        <p className="text-xs text-base-content-secondary mt-1">
                          {reportSummary.totalAprovadas} aprovada{reportSummary.totalAprovadas !== 1 ? 's' : ''}
                          {reportSummary.totalReprovadas > 0 && (
                            <> · {reportSummary.totalReprovadas} reprovada{reportSummary.totalReprovadas !== 1 ? 's' : ''}</>
                          )}
                        </p>
                      </div>
                      <div className="rounded-xl bg-base-300/30 border border-base-300/40 p-3">
                        <p className="text-xs font-medium text-base-content-secondary uppercase tracking-wide">Designers envolvidos</p>
                        <p className="text-xl font-bold text-base-content mt-0.5">{reportSummary.numDesigners}</p>
                        <p className="text-xs text-base-content-secondary mt-1">design{reportSummary.numDesigners !== 1 ? 's' : ''} com demanda na semana</p>
                      </div>
                      {reportSummary.topSolicitante && (
                        <div className="rounded-xl bg-base-300/30 border border-base-300/40 p-3">
                          <p className="text-xs font-medium text-base-content-secondary uppercase tracking-wide">Quem mais solicitou</p>
                          <p className="text-base font-bold text-base-content mt-0.5 truncate" title={reportSummary.topSolicitante.name}>{reportSummary.topSolicitante.name}</p>
                          <p className="text-xs text-base-content-secondary mt-1">{reportSummary.topSolicitante.count} demanda{reportSummary.topSolicitante.count !== 1 ? 's' : ''}</p>
                        </div>
                      )}
                      {reportSummary.topDesigner && (
                        <div className="rounded-xl bg-base-300/30 border border-base-300/40 p-3">
                          <p className="text-xs font-medium text-base-content-secondary uppercase tracking-wide">Design que mais atendeu</p>
                          <p className="text-base font-bold text-base-content mt-0.5 truncate" title={reportSummary.topDesigner.name}>{reportSummary.topDesigner.name}</p>
                          <p className="text-xs text-base-content-secondary mt-1">{reportSummary.topDesigner.count} demanda{reportSummary.topDesigner.count !== 1 ? 's' : ''}</p>
                        </div>
                      )}
                    </div>

                    {(reportSummary.topSolicitantes.length > 0 || reportSummary.topArtists.length > 0 || reportSummary.topDesigners.length > 0) && (
                      <div className="border-t border-base-300/50 pt-4">
                        <p className="text-xs font-semibold text-base-content-secondary uppercase tracking-wide mb-3">Ranking (top 3)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                          {reportSummary.topSolicitantes.length > 0 && (
                            <div className="min-w-0">
                              <p className="font-medium text-base-content mb-2">Solicitantes</p>
                              <ol className="space-y-2 text-base-content-secondary">
                                {reportSummary.topSolicitantes.map((s, i) => (
                                  <li key={`${s.name}-${i}`} className="flex items-baseline justify-between gap-3">
                                    <span className="min-w-0 truncate" title={s.name}>{i + 1}. {s.name}</span>
                                    <span className="flex-shrink-0 font-medium text-base-content tabular-nums">{s.count} demanda{s.count !== 1 ? 's' : ''}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                          {reportSummary.topArtists.length > 0 && (
                            <div className="min-w-0">
                              <p className="font-medium text-base-content mb-2">Artistas mais demandados</p>
                              <ol className="space-y-2 text-base-content-secondary">
                                {reportSummary.topArtists.map((a, i) => (
                                  <li key={`${a.name}-${i}`} className="flex items-baseline justify-between gap-3">
                                    <span className="min-w-0 truncate" title={a.name}>{i + 1}. {a.name}</span>
                                    <span className="flex-shrink-0 font-medium text-base-content tabular-nums">{a.count} demanda{a.count !== 1 ? 's' : ''}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                          {reportSummary.topDesigners.length > 0 && (
                            <div className="min-w-0">
                              <p className="font-medium text-base-content mb-2">Designers que mais atenderam</p>
                              <ol className="space-y-2 text-base-content-secondary">
                                {reportSummary.topDesigners.map((d, i) => (
                                  <li key={`${d.name}-${i}`} className="flex items-baseline justify-between gap-3">
                                    <span className="min-w-0 truncate" title={d.name}>{i + 1}. {d.name}</span>
                                    <span className="flex-shrink-0 font-medium text-base-content tabular-nums">{d.count} demanda{d.count !== 1 ? 's' : ''}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {reportSummary.byMediaType.length > 0 && (
                      <div className="border-t border-base-300/50 pt-4">
                        <p className="text-xs font-semibold text-base-content-secondary uppercase tracking-wide mb-3">Demandas por tipo de mídia (tag)</p>
                        <div className="flex flex-wrap gap-2">
                          {reportSummary.byMediaType.map(({ label, count }) => (
                            <span
                              key={label}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-base-300/50 border border-base-300/40 text-sm"
                            >
                              <span className="font-medium text-base-content">{label}</span>
                              <span className="text-base-content-secondary tabular-nums">{count}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
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
