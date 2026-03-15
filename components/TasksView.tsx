import React, { useState, useMemo, useEffect } from 'react';
import { Designer, Task, TaskApprovalStatus, UpdateTaskPayload } from '../types';
import { MEDIA_PRICES } from '../constants';
import { formatDate, formatCurrency, getWeekRange, toLocalDateString, getTaskPayableValue } from '../utils/dateUtils';
import Modal from './Modal';
import { PlusIcon, ClockIcon, PencilIcon, TrashIcon, ClipboardDocumentListIcon } from './icons/Icons';
import EmptyState from './EmptyState';

const ARTISTAS_SELECIONAVEIS = [
  'Aldair Playboy', 'Briola Ferro na Boneca', 'Cesinha', 'Fábricia Cantora', 'Felipe Grilo', 'Felipão',
  'Forró dos 3', 'Ju Moura', 'Kátia Cilene', 'Kelvy Pablo', 'Laninha Show', 'Mara Pavanelly', 'Pagula',
  'PHD', 'PHD MKT', 'Renno Poeta', 'Tony Guerra',
] as const;

const SOLICITANTES_SELECIONAVEIS = [
  'Christian Rodrigues', 'Jully Morais', 'Livia Xavier', 'Pâmela Emilly', 'Pietra Carvalho', 'Rhuan Coliver', 'Suyanne Almeida',
] as const;

/** Solicitante fixo para Plantão Final de Semana. */
const SOLICITANTE_PLANTAO_FDS = 'Christian Rodrigues';

interface NewDemandRow {
  id: string;
  titulo: string;
  artista: string;
  design: string;
  solicitante: string;
  tag: string;
  dataDemanda: string;
  quantidade: number;
  /** Aprovada = valor integral; Reprovada = paga 30% do valor. */
  approval_status: TaskApprovalStatus;
}

const initialNewDemandRow = (): NewDemandRow => ({
  id: crypto.randomUUID(),
  titulo: '',
  artista: '',
  design: '',
  solicitante: '',
  tag: '',
  dataDemanda: new Date().toISOString().slice(0, 10),
  quantidade: 1,
  approval_status: 'approved',
});

interface TasksViewProps {
  tasks: Task[];
  designers: Designer[];
  onAddTask: (taskData: Omit<Task, 'id' | 'created_at' | 'value'>) => Promise<boolean>;
  onInsertTasks: (payloads: Array<Omit<Task, 'id' | 'created_at' | 'value'>>) => Promise<boolean>;
  onUpdateTask: (taskId: string, taskData: UpdateTaskPayload) => void;
  onDeleteTask: (taskId: string) => void;
  loggedInUser: Designer;
}

const TaskTable: React.FC<{
  tasks: Task[];
  isDirector: boolean;
  designerMap: Map<string, string>;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}> = ({ tasks, isDirector, designerMap, onEdit, onDelete }) => (
    <div className="overflow-x-auto rounded-b-2xl border border-t-0 border-base-300/40">
      <table className="w-full text-left">
          <thead className="border-b border-base-300 bg-base-200/60">
              <tr>
                  <th className="p-4 font-semibold text-base-content-secondary">Mídia</th>
                  <th className="p-4 font-semibold text-base-content-secondary">Designer</th>
                  <th className="p-4 font-semibold text-base-content-secondary">Entrega</th>
                  <th className="p-4 font-semibold text-base-content-secondary">Status</th>
                  <th className="p-4 font-semibold text-base-content-secondary">Valor</th>
                  {isDirector && <th className="p-4 font-semibold text-base-content-secondary">Ações</th>}
              </tr>
          </thead>
          <tbody>
              {tasks.map(task => {
                const payable = getTaskPayableValue(task);
                const isRejected = task.approval_status === 'rejected';
                return (
                  <tr key={task.id} className="border-b border-base-300/40 hover:bg-base-100/50 last:border-b-0 transition-smooth">
                      <td className="p-4 align-top">
                          <p className="font-semibold text-base-content">{task.media_type}</p>
                          {(task.description && task.description !== '-') && (
                            <p className="text-xs text-base-content-secondary/80 mt-1 italic whitespace-pre-wrap">
                                {task.description}
                            </p>
                          )}
                      </td>
                      <td className="p-4 text-base-content-secondary align-top">{designerMap.get(task.designer_id) || 'N/A'}</td>
                      <td className="p-4 text-base-content-secondary align-top">{formatDate(task.due_date)}</td>
                      <td className="p-4 align-top">
                          <span className={`text-sm font-medium ${isRejected ? 'text-amber-500' : 'text-green-600'}`}>
                            {isRejected ? 'Reprovada' : 'Aprovada'}
                          </span>
                      </td>
                      <td className="p-4 font-semibold text-base-content align-top">
                        {formatCurrency(payable)}
                        {isRejected && <span className="text-xs text-base-content-secondary ml-1">(30%)</span>}
                      </td>
                      {isDirector && (
                          <td className="p-4 align-top">
                              <div className="flex items-center space-x-2">
                                  <button onClick={() => onEdit(task)} className="p-2 text-base-content-secondary hover:text-blue-400 transition-colors">
                                      <PencilIcon />
                                  </button>
                                  <button onClick={() => onDelete(task.id)} className="p-2 text-base-content-secondary hover:text-red-500 transition-colors">
                                      <TrashIcon />
                                  </button>
                              </div>
                          </td>
                      )}
                  </tr>
                );
              })}
          </tbody>
      </table>
    </div>
);


const TasksView: React.FC<TasksViewProps> = ({ tasks, designers, onAddTask, onInsertTasks, onUpdateTask, onDeleteTask, loggedInUser }) => {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeDesigners = Array.isArray(designers) ? designers : [];
  /** Designers que podem ser atribuídos a demandas (exclui Diretor e Financeiro). */
  const assignableDesigners = useMemo(
    () => safeDesigners.filter(d => d.role !== 'Diretor de Arte' && d.role !== 'Financeiro'),
    [safeDesigners]
  );
  const isDirector = loggedInUser?.role === 'Diretor de Arte';
  const filtersStorageKey = `tasks-view-filters-${loggedInUser?.id ?? 'default'}`;

  // Sem filtro de data por padrão para exibir todas as demandas; usuário pode restringir por período depois.
  const defaultStartDate = '';
  const defaultEndDate = '';

  const defaultFilterDesigner = isDirector ? 'all' : (loggedInUser?.id ?? 'all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const initialFormState: Omit<Task, 'id' | 'created_at' | 'value'> & { approval_status?: Task['approval_status'] } = { 
    designer_id: isDirector ? '' : loggedInUser.id, 
    media_type: '', 
    due_date: '', 
    artist: '-', 
    social_media: '-',
    description: '-',
    approval_status: 'approved',
  };
  const [formData, setFormData] = useState<Omit<Task, 'id' | 'created_at' | 'value'> & { approval_status?: Task['approval_status'] }>(initialFormState);

  /** 'single' = uma demanda (ex.: plantão FDS, sem artista/título/solicitante); 'batch' = várias em lote */
  const [newDemandModalMode, setNewDemandModalMode] = useState<'single' | 'batch' | null>(null);
  /** Apenas para Plantão Final de Semana no modo "Uma demanda": sábado e domingo (YYYY-MM-DD). */
  const [plantaoSabado, setPlantaoSabado] = useState('');
  const [plantaoDomingo, setPlantaoDomingo] = useState('');
  const [newDemandForm, setNewDemandForm] = useState<NewDemandRow>(() => initialNewDemandRow());
  const [newDemandLines, setNewDemandLines] = useState<NewDemandRow[]>([]);
  const [isSubmittingNewDemands, setIsSubmittingNewDemands] = useState(false);
  
  const [filterDesigner, setFilterDesigner] = useState<string>(defaultFilterDesigner);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    try {
      const savedFilters = window.localStorage.getItem(filtersStorageKey);
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters) as { filterDesigner?: string; startDate?: string; endDate?: string };
        setFilterDesigner(parsed.filterDesigner || defaultFilterDesigner);
        setStartDate(parsed.startDate || '');
        setEndDate(parsed.endDate || '');
        return;
      }
    } catch {
      // Ignore storage read/parse errors and fallback to safe defaults.
    }

    // Keep current behavior as fallback when there are no saved filters.
    setFilterDesigner(defaultFilterDesigner);
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
  }, [filtersStorageKey, defaultFilterDesigner, defaultStartDate, defaultEndDate]);

  useEffect(() => {
    try {
      const payload = JSON.stringify({ filterDesigner, startDate, endDate });
      window.localStorage.setItem(filtersStorageKey, payload);
    } catch {
      // Ignore storage write errors to prevent breaking the page.
    }
  }, [filtersStorageKey, filterDesigner, startDate, endDate]);

  const designerMap = useMemo(() => new Map(safeDesigners.map(d => [d.id, d.name])), [safeDesigners]);

  const openAddModal = () => {
    setEditingTask(null);
    setNewDemandModalMode(null);
    setPlantaoSabado('');
    setPlantaoDomingo('');
    setNewDemandForm(initialNewDemandRow());
    setNewDemandLines([]);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const isPlantaoFDS = newDemandForm.tag === 'Plantão Final de Semana';
  const addNewDemandLine = () => {
    const hasRequired = newDemandForm.design && newDemandForm.tag && newDemandForm.dataDemanda;
    const hasTituloOrPlantao = newDemandForm.titulo.trim() || isPlantaoFDS;
    if (!hasRequired || !hasTituloOrPlantao) return;
    const qty = Math.max(1, Math.min(100, newDemandForm.quantidade || 1));
    setNewDemandLines((prev) => [...prev, { ...newDemandForm, id: crypto.randomUUID(), quantidade: qty }]);
    setNewDemandForm(initialNewDemandRow());
  };

  const removeNewDemandLine = (id: string) => {
    setNewDemandLines((prev) => prev.filter((r) => r.id !== id));
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    const dueDateStr = task.due_date != null ? String(task.due_date).split('T')[0] : '';
    setFormData({
      designer_id: task.designer_id,
      media_type: task.media_type,
      due_date: dueDateStr,
      artist: task.artist || '-',
      social_media: task.social_media || '-',
      description: task.description || '-',
      approval_status: task.approval_status ?? 'approved',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleDelete = (taskId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta demanda? Esta ação não pode ser desfeita.')) {
      onDeleteTask(taskId);
    }
  };

  const handleCreateDemands = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newDemandLines.length === 0) return;
    const payloads: Array<Omit<Task, 'id' | 'created_at' | 'value'>> = [];
    for (const row of newDemandLines) {
      const designer = safeDesigners.find((d) => d.name === row.design);
      if (!designer) continue;
      const dueDate = row.dataDemanda.trim().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) continue;
      const isRowPlantao = row.tag === 'Plantão Final de Semana';
      const description = isRowPlantao
        ? (row.titulo.trim() ? row.titulo.trim() + ' | ' : '') + 'Plantão Final de Semana | Solicitante: ' + SOLICITANTE_PLANTAO_FDS
        : [row.titulo.trim(), row.solicitante ? `Solicitante: ${row.solicitante}` : ''].filter(Boolean).join(' | ') || '-';
      const taskPayload: Omit<Task, 'id' | 'created_at' | 'value'> = {
        designer_id: designer.id,
        media_type: row.tag,
        due_date: dueDate,
        artist: row.artista || '-',
        social_media: '-',
        description,
        approval_status: row.approval_status ?? 'approved',
      };
      for (let i = 0; i < row.quantidade; i++) payloads.push({ ...taskPayload });
    }
    if (payloads.length === 0) return;
    setIsSubmittingNewDemands(true);
    const success = await onInsertTasks(payloads);
    setIsSubmittingNewDemands(false);
    if (success) {
      closeModal();
      setNewDemandLines([]);
      setNewDemandForm(initialNewDemandRow());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isPlantaoFDSSingle = formData.media_type === 'Plantão Final de Semana' && !editingTask;
    const useTwoDates = isPlantaoFDSSingle && plantaoSabado && plantaoDomingo;

    if (editingTask) {
      if (!formData.designer_id || !formData.media_type || !formData.due_date) return;
      const payload = {
        ...formData,
        artist: formData.artist || '-',
        social_media: formData.social_media || '-',
        description: formData.description ?? '-',
      };
      onUpdateTask(editingTask.id, {
        ...payload,
        value: MEDIA_PRICES[formData.media_type]?.price ?? 0,
        approval_status: formData.approval_status ?? 'approved',
      });
      closeModal();
      return;
    }

    if (useTwoDates) {
      if (!formData.designer_id || !formData.media_type) return;
      // Uma única demanda para o final de semana (sáb + dom), data de referência = sábado
      const descriptionWithDates = `Plantão Final de Semana (${formatDate(plantaoSabado)} e ${formatDate(plantaoDomingo)}) | Solicitante: ${SOLICITANTE_PLANTAO_FDS}`;
      const payload: Omit<Task, 'id' | 'created_at' | 'value'> = {
        designer_id: formData.designer_id,
        media_type: formData.media_type,
        due_date: plantaoSabado,
        artist: '-',
        social_media: '-',
        description: descriptionWithDates,
        approval_status: formData.approval_status ?? 'approved',
      };
      if (isDirector && filterDesigner !== 'all' && filterDesigner !== formData.designer_id) {
        setFilterDesigner(formData.designer_id);
      }
      const weekRange = getWeekRange(new Date(plantaoSabado + 'T12:00:00.000-03:00'));
      if (startDate && endDate) {
        if (plantaoSabado < startDate || plantaoDomingo > endDate) {
          setStartDate(toLocalDateString(weekRange.start));
          setEndDate(toLocalDateString(weekRange.end));
        }
      } else {
        setStartDate(toLocalDateString(weekRange.start));
        setEndDate(toLocalDateString(weekRange.end));
      }
      setIsSubmitting(true);
      const success = await onAddTask(payload);
      setIsSubmitting(false);
      if (success) closeModal();
      return;
    }

    if (!formData.designer_id || !formData.media_type || !formData.due_date) return;

    const payload = {
      ...formData,
      artist: formData.artist || '-',
      social_media: formData.social_media || '-',
      description: formData.description ?? '-',
    };

    if (isDirector && filterDesigner !== 'all' && filterDesigner !== payload.designer_id) {
      setFilterDesigner(payload.designer_id);
    }

    const dueDateStr = payload.due_date;
    if (startDate && endDate) {
      if (dueDateStr < startDate || dueDateStr > endDate) {
        const weekRange = getWeekRange(new Date(dueDateStr + 'T12:00:00.000-03:00'));
        setStartDate(toLocalDateString(weekRange.start));
        setEndDate(toLocalDateString(weekRange.end));
      }
    } else {
      const weekRange = getWeekRange(new Date(dueDateStr + 'T12:00:00.000-03:00'));
      setStartDate(toLocalDateString(weekRange.start));
      setEndDate(toLocalDateString(weekRange.end));
    }

    setIsSubmitting(true);
    const success = await onAddTask(payload);
    setIsSubmitting(false);
    if (success) closeModal();
  };

  const filteredTasks = useMemo(() => {
    return safeTasks.filter(task => {
      const designerMatch = filterDesigner === 'all' || task.designer_id === filterDesigner;

      const dateMatch = (() => {
        if (!startDate || !endDate) {
          return true; // Don't filter if dates aren't set
        }
        const raw = task.due_date != null ? String(task.due_date) : '';
        const taskDueDate = raw.trim().slice(0, 10);
        if (!taskDueDate || taskDueDate.length < 10) return false;
        return taskDueDate >= startDate && taskDueDate <= endDate;
      })();

      return designerMatch && dateMatch;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [safeTasks, filterDesigner, startDate, endDate]);
  
  const groupedTasks = useMemo(() => {
    const fallbackKey = 'sem-data';
    const groups: Record<string, { weekRange: { start: Date; end: Date }; tasks: Task[] }> = {};

    try {
      filteredTasks.forEach(task => {
        const dueDate = (task.due_date != null ? String(task.due_date) : '').trim();
        if (!dueDate) {
          if (!groups[fallbackKey]) {
            groups[fallbackKey] = { weekRange: getWeekRange(new Date()), tasks: [] };
          }
          groups[fallbackKey].tasks.push(task);
          return;
        }
        // Usar meio-dia no fuso -03 para evitar que "YYYY-MM-DD" vire dia anterior (UTC meia-noite)
        const date = new Date(dueDate.length >= 10 ? dueDate.slice(0, 10) + 'T12:00:00.000-03:00' : dueDate);
        if (Number.isNaN(date.getTime())) {
          if (!groups[fallbackKey]) {
            groups[fallbackKey] = { weekRange: getWeekRange(new Date()), tasks: [] };
          }
          groups[fallbackKey].tasks.push(task);
          return;
        }
        const weekRange = getWeekRange(date);
        const weekKey = toLocalDateString(weekRange.start);
        if (!groups[weekKey]) {
          groups[weekKey] = { weekRange, tasks: [] };
        }
        groups[weekKey].tasks.push(task);
      });
    } catch (_e) {
      groups[fallbackKey] = { weekRange: getWeekRange(new Date()), tasks: [...filteredTasks] };
    }

    return groups;
  }, [filteredTasks]);

  return (
    <div className="space-y-6">
      <header className="pb-2 border-b border-base-300/40">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-base-content flex items-center gap-2">
              <ClipboardDocumentListIcon className="h-8 w-8 text-brand-primary hidden sm:block" />
              Demandas
            </h2>
            <p className="text-sm text-base-content-secondary mt-1">
              {isDirector ? 'Gerencie e filtre demandas por designer e período' : 'Suas demandas atribuídas'}
            </p>
          </div>
          {isDirector && (
            <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
              <button 
                onClick={openAddModal} 
                className="flex items-center bg-brand-primary text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-brand-secondary transition-smooth shadow-brand"
              >
                <PlusIcon />
                <span className="ml-2">Nova Demanda</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {!isDirector && (
          <div className="bg-base-100/90 backdrop-blur-sm p-4 rounded-xl border border-base-300/40">
              <p className="text-base-content-secondary text-sm">
                  A gestão de demandas é realizada exclusivamente pelo Diretor de Arte. Você pode visualizar suas demandas atribuídas abaixo.
              </p>
          </div>
      )}

      <div className="flex flex-wrap items-center gap-4 bg-base-100/90 backdrop-blur-sm p-4 rounded-2xl shadow-card border border-base-300/40">
        <span className="font-semibold text-base-content-secondary text-sm uppercase tracking-wide">Filtros</span>
        {isDirector && (
          <select value={filterDesigner} onChange={e => setFilterDesigner(e.target.value)} className="px-3 py-2 rounded-xl bg-base-200 border border-base-300 text-base-content focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none text-sm">
            <option value="all">Todos os Designers</option>
            {safeDesigners.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
        <div className="flex items-center gap-2">
            <label htmlFor="start-date" className="text-sm font-medium text-base-content-secondary whitespace-nowrap">Entrega de:</label>
            <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-3 py-2 rounded-xl bg-base-200 border border-base-300 text-base-content focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none text-sm"
            />
        </div>
        <div className="flex items-center gap-2">
            <label htmlFor="end-date" className="text-sm font-medium text-base-content-secondary whitespace-nowrap">Até:</label>
            <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-3 py-2 rounded-xl bg-base-200 border border-base-300 text-base-content focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none text-sm"
            />
        </div>
        <button 
          onClick={() => { setStartDate(''); setEndDate(''); }}
          className="px-3 py-2 text-sm text-base-content-secondary hover:bg-base-300 hover:text-base-content rounded-xl transition-smooth"
          title="Limpar filtro de data"
        >
          Mostrar Todas
        </button>
      </div>

       <div className="space-y-6">
        {Object.keys(groupedTasks).length > 0 ? (
          Object.keys(groupedTasks).map((weekKey) => {
            const group = groupedTasks[weekKey];
            return (
              <details key={weekKey} className="bg-base-100/90 backdrop-blur-sm rounded-2xl shadow-card border border-base-300/40 overflow-hidden group" open>
                <summary className="p-4 font-bold text-base cursor-pointer hover:bg-base-200/40 list-none flex items-center gap-2 transition-smooth rounded-t-2xl">
                  <ClockIcon className="h-5 w-5 text-brand-primary flex-shrink-0" />
                  {weekKey === 'sem-data'
                    ? 'Demandas sem data definida'
                    : `Semana (sáb–sex) ${formatDate(toLocalDateString(group.weekRange.start))} a ${formatDate(toLocalDateString(group.weekRange.end))}`}
                </summary>
                <TaskTable
                  tasks={group.tasks}
                  isDirector={isDirector}
                  designerMap={designerMap}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                />
              </details>
            );
          })
        ) : (
          <EmptyState
            icon={<ClipboardDocumentListIcon />}
            title="Nenhuma demanda encontrada para os filtros selecionados."
            description="Ajuste os filtros de designer ou período para ver as demandas."
          />
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingTask ? 'Editar Demanda' : 'Nova Demanda'}
        contentClassName={!editingTask && newDemandModalMode !== 'single' ? 'max-w-4xl' : undefined}
      >
        {editingTask ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isDirector && (
              <div>
                <label className="block text-sm font-medium text-base-content-secondary mb-1">Designer</label>
                <select value={formData.designer_id} onChange={e => setFormData({ ...formData, designer_id: e.target.value })} className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none" required>
                  <option value="">Selecione um designer</option>
                  {assignableDesigners.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-base-content-secondary mb-1">Tipo de Mídia</label>
              <select value={formData.media_type} onChange={e => setFormData({ ...formData, media_type: e.target.value })} className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none" required>
                <option value="">Selecione um tipo</option>
                {Object.entries(MEDIA_PRICES).map(([key, media]) => <option key={key} value={key}>{media.name} - {formatCurrency(media.price)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-base-content-secondary mb-1">Data de Entrega</label>
              <input type="date" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none" required />
            </div>
            {isDirector && (
              <div>
                <label className="block text-sm font-medium text-base-content-secondary mb-1">Status da demanda</label>
                <select
                  value={formData.approval_status ?? 'approved'}
                  onChange={e => setFormData({ ...formData, approval_status: e.target.value as TaskApprovalStatus })}
                  className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none"
                >
                  <option value="approved">Aprovada (valor integral)</option>
                  <option value="rejected">Reprovada (paga 30%)</option>
                </select>
              </div>
            )}
            <div className="flex justify-end pt-4 sticky bottom-0 bg-base-100 pb-2">
              <button type="submit" disabled={isSubmitting} className="bg-brand-primary text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-brand-secondary transition-smooth shadow-brand disabled:opacity-60 disabled:cursor-not-allowed">
                {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        ) : newDemandModalMode === null ? (
          <div className="space-y-6 py-2">
            <p className="text-sm text-base-content-secondary">
              Escolha como deseja adicionar a(s) demanda(s):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setNewDemandModalMode('single')}
                className="p-5 rounded-2xl border-2 border-base-300 bg-base-200/50 hover:border-brand-primary hover:bg-brand-primary/10 transition-smooth text-left"
              >
                <span className="font-semibold text-base-content block mb-1">Uma demanda</span>
                <span className="text-sm text-base-content-secondary">
                  Ideal para <strong>Plantão Final de Semana</strong> (sábado/domingo): só designer, tipo e data. Sem artista, título ou solicitante.
                </span>
              </button>
              <button
                type="button"
                onClick={() => setNewDemandModalMode('batch')}
                className="p-5 rounded-2xl border-2 border-base-300 bg-base-200/50 hover:border-brand-primary hover:bg-brand-primary/10 transition-smooth text-left"
              >
                <span className="font-semibold text-base-content block mb-1">Várias demandas (lote)</span>
                <span className="text-sm text-base-content-secondary">
                  Várias linhas com título, artista, designer, solicitante e tipo de mídia. Para Plantão FDS o título/artista/solicitante são opcionais.
                </span>
              </button>
            </div>
          </div>
        ) : newDemandModalMode === 'single' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isDirector && (
              <div>
                <label className="block text-sm font-medium text-base-content-secondary mb-1">Designer</label>
                <select value={formData.designer_id} onChange={e => setFormData({ ...formData, designer_id: e.target.value })} className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none" required>
                  <option value="">Selecione um designer</option>
                  {assignableDesigners.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-base-content-secondary mb-1">Tipo de Mídia</label>
              <select value={formData.media_type} onChange={e => setFormData({ ...formData, media_type: e.target.value })} className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none" required>
                <option value="">Selecione um tipo</option>
                {Object.entries(MEDIA_PRICES).map(([key, media]) => <option key={key} value={key}>{media.name} - {formatCurrency(media.price)}</option>)}
              </select>
              {formData.media_type === 'Plantão Final de Semana' && (
                <p className="text-xs text-base-content-secondary mt-1.5">Informe as datas de sábado e domingo para criar as duas demandas.</p>
              )}
            </div>
            {formData.media_type === 'Plantão Final de Semana' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-base-content-secondary mb-1">Data sábado</label>
                  <input
                    type="date"
                    value={plantaoSabado}
                    onChange={e => setPlantaoSabado(e.target.value)}
                    className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none"
                    required={formData.media_type === 'Plantão Final de Semana'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-base-content-secondary mb-1">Data domingo</label>
                  <input
                    type="date"
                    value={plantaoDomingo}
                    onChange={e => setPlantaoDomingo(e.target.value)}
                    className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none"
                    required={formData.media_type === 'Plantão Final de Semana'}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-base-content-secondary mb-1">Data de Entrega</label>
                <input type="date" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none" required />
              </div>
            )}
            {isDirector && (
              <div>
                <label className="block text-sm font-medium text-base-content-secondary mb-1">Status da demanda</label>
                <select
                  value={formData.approval_status ?? 'approved'}
                  onChange={e => setFormData({ ...formData, approval_status: e.target.value as TaskApprovalStatus })}
                  className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none"
                >
                  <option value="approved">Aprovada (valor integral)</option>
                  <option value="rejected">Reprovada (paga 30%)</option>
                </select>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-base-100 pb-2">
              <button type="button" onClick={() => setNewDemandModalMode(null)} className="px-4 py-2.5 rounded-xl font-semibold border border-base-300 text-base-content hover:bg-base-200 transition-smooth">
                Voltar
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  (formData.media_type === 'Plantão Final de Semana' && (!plantaoSabado || !plantaoDomingo))
                }
                className="bg-brand-primary text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-brand-secondary transition-smooth shadow-brand disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Salvando...' : formData.media_type === 'Plantão Final de Semana' && plantaoSabado && plantaoDomingo ? 'Criar demanda (sáb + dom)' : 'Criar demanda'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <button type="button" onClick={() => setNewDemandModalMode(null)} className="text-sm text-base-content-secondary hover:text-brand-primary transition-smooth">
                ← Voltar
              </button>
            </div>
            <p className="text-sm text-base-content-secondary mb-5">
              Preencha os campos abaixo e use <strong>Adicionar linha</strong> para incluir cada item. Depois, crie todas as demandas de uma vez.
            </p>

            <section className="space-y-5">
              <h4 className="text-sm font-semibold text-base-content-secondary uppercase tracking-wide">Dados da linha</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium text-base-content-secondary mb-1.5">Título da demanda</label>
                  <input
                    type="text"
                    value={newDemandForm.titulo}
                    onChange={e => setNewDemandForm(f => ({ ...f, titulo: e.target.value }))}
                    placeholder="Ex.: Arte agenda Insta"
                    className="w-full px-3 py-2.5 rounded-xl border border-base-300 bg-base-200 focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary outline-none text-sm transition-smooth"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-base-content-secondary mb-1.5">Artista</label>
                  <select
                    value={newDemandForm.artista}
                    onChange={e => setNewDemandForm(f => ({ ...f, artista: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-base-300 bg-base-200 focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary outline-none text-sm transition-smooth"
                  >
                    <option value="">Selecione</option>
                    {ARTISTAS_SELECIONAVEIS.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-base-content-secondary mb-1.5">Design</label>
                  <select
                    value={newDemandForm.design}
                    onChange={e => setNewDemandForm(f => ({ ...f, design: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-base-300 bg-base-200 focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary outline-none text-sm transition-smooth"
                    required
                  >
                    <option value="">Selecione</option>
                    {assignableDesigners.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-base-content-secondary mb-1.5">Solicitante</label>
                  <select
                    value={newDemandForm.solicitante}
                    onChange={e => setNewDemandForm(f => ({ ...f, solicitante: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-base-300 bg-base-200 focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary outline-none text-sm transition-smooth"
                  >
                    <option value="">Selecione</option>
                    {SOLICITANTES_SELECIONAVEIS.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-base-content-secondary mb-1.5">Tag (tipo de mídia)</label>
                  <select
                    value={newDemandForm.tag}
                    onChange={e => {
                      const tag = e.target.value;
                      setNewDemandForm(f => ({
                        ...f,
                        tag,
                        solicitante: tag === 'Plantão Final de Semana' ? SOLICITANTE_PLANTAO_FDS : f.solicitante,
                      }));
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-base-300 bg-base-200 focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary outline-none text-sm transition-smooth"
                    required
                  >
                    <option value="">Selecione</option>
                    {Object.keys(MEDIA_PRICES).map(key => (
                      <option key={key} value={key}>{key}</option>
                    ))}
                  </select>
                  {isPlantaoFDS && (
                    <p className="text-xs text-base-content-secondary mt-1.5">Título, artista e solicitante são opcionais para plantão (sáb/dom).</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-base-content-secondary mb-1.5">Data da demanda</label>
                  <input
                    type="date"
                    value={newDemandForm.dataDemanda}
                    onChange={e => setNewDemandForm(f => ({ ...f, dataDemanda: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-base-300 bg-base-200 focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary outline-none text-sm transition-smooth"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-base-content-secondary mb-1.5">Quantidade</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={newDemandForm.quantidade || ''}
                    onChange={e => setNewDemandForm(f => ({ ...f, quantidade: parseInt(e.target.value, 10) || 1 }))}
                    placeholder="1"
                    className="w-full px-3 py-2.5 rounded-xl border border-base-300 bg-base-200 focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary outline-none text-sm transition-smooth"
                  />
                </div>
                {isDirector && (
                  <div>
                    <label className="block text-sm font-medium text-base-content-secondary mb-1.5">Status</label>
                    <select
                      value={newDemandForm.approval_status ?? 'approved'}
                      onChange={e => setNewDemandForm(f => ({ ...f, approval_status: e.target.value as TaskApprovalStatus }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-base-300 bg-base-200 focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary outline-none text-sm transition-smooth"
                    >
                      <option value="approved">Aprovada (valor integral)</option>
                      <option value="rejected">Reprovada (paga 30%)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={addNewDemandLine}
                  disabled={(!newDemandForm.titulo.trim() && !isPlantaoFDS) || !newDemandForm.design || !newDemandForm.tag || !newDemandForm.dataDemanda}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-brand-primary text-white hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-smooth shadow-brand"
                >
                  <PlusIcon className="h-5 w-5" />
                  Adicionar linha
                </button>
                {newDemandLines.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => handleCreateDemands(e)}
                    disabled={isSubmittingNewDemands}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed transition-smooth"
                  >
                    {isSubmittingNewDemands ? 'Criando...' : `Criar ${newDemandLines.reduce((acc, r) => acc + r.quantidade, 0)} demanda(s)`}
                  </button>
                )}
              </div>
            </section>

            {newDemandLines.length > 0 && (
              <section className="space-y-3 pt-2 border-t border-base-300/50">
                <h4 className="text-sm font-semibold text-base-content-secondary uppercase tracking-wide">
                  Linhas adicionadas ({newDemandLines.length})
                </h4>
                <div className="overflow-x-auto rounded-xl border border-base-300/50 max-h-56 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-sm min-w-[600px]">
                    <thead className="sticky top-0 bg-base-200/95 backdrop-blur-sm z-10 border-b border-base-300">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-base-content-secondary whitespace-nowrap">Título</th>
                        <th className="px-4 py-3 font-semibold text-base-content-secondary whitespace-nowrap">Artista</th>
                        <th className="px-4 py-3 font-semibold text-base-content-secondary whitespace-nowrap">Design</th>
                        <th className="px-4 py-3 font-semibold text-base-content-secondary whitespace-nowrap">Tag</th>
                        <th className="px-4 py-3 font-semibold text-base-content-secondary whitespace-nowrap">Data</th>
                        <th className="px-4 py-3 font-semibold text-base-content-secondary whitespace-nowrap">Qtd</th>
                        {isDirector && <th className="px-4 py-3 font-semibold text-base-content-secondary whitespace-nowrap">Status</th>}
                        <th className="px-4 py-3 w-12" aria-label="Remover" />
                      </tr>
                    </thead>
                    <tbody>
                      {newDemandLines.map(row => {
                        const isRejected = (row.approval_status ?? 'approved') === 'rejected';
                        return (
                          <tr key={row.id} className="border-b border-base-300/30 last:border-b-0 hover:bg-base-200/30 transition-colors">
                            <td className="px-4 py-3 text-base-content font-medium">{row.tag === 'Plantão Final de Semana' && !row.titulo.trim() ? 'Plantão Final de Semana' : row.titulo || '—'}</td>
                            <td className="px-4 py-3 text-base-content-secondary">{row.artista || '—'}</td>
                            <td className="px-4 py-3 text-base-content-secondary">{row.design || '—'}</td>
                            <td className="px-4 py-3 text-base-content-secondary">{row.tag || '—'}</td>
                            <td className="px-4 py-3 text-base-content-secondary whitespace-nowrap">{row.dataDemanda ? new Date(row.dataDemanda + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                            <td className="px-4 py-3 text-base-content-secondary">{row.quantidade}</td>
                            {isDirector && (
                              <td className="px-4 py-3">
                                <span className={`text-xs font-medium ${isRejected ? 'text-amber-500' : 'text-green-600'}`}>
                                  {isRejected ? 'Reprovada (30%)' : 'Aprovada'}
                                </span>
                              </td>
                            )}
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => removeNewDemandLine(row.id)}
                                className="p-2 text-base-content-secondary hover:text-error hover:bg-error/10 rounded-lg transition-smooth"
                                title="Remover linha"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default TasksView;
