
import React, { useState, useMemo, useEffect } from 'react';
import { Designer, Task, TaskApprovalStatus, UpdateTaskPayload } from '../types';
import { MEDIA_PRICES } from '../constants';
import { formatDate, formatCurrency, getWeekRange, toLocalDateString, getTaskPayableValue } from '../utils/dateUtils';
import Modal from './Modal';
import { PlusIcon, ClockIcon, PencilIcon, TrashIcon, SquaresPlusIcon, ClipboardDocumentListIcon } from './icons/Icons';

interface TasksViewProps {
  tasks: Task[];
  designers: Designer[];
  onAddTask: (taskData: Omit<Task, 'id' | 'created_at' | 'value'>) => Promise<boolean>;
  onAddTasksBulk: (taskData: Omit<Task, 'id' | 'created_at' | 'value'>, quantity: number) => Promise<boolean>;
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
                  {isDirector && <th className="p-4 font-semibold text-base-content-secondary">Status</th>}
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
                      {isDirector && (
                          <td className="p-4 align-top">
                              <span className={`text-sm font-medium ${isRejected ? 'text-amber-500' : 'text-green-600'}`}>
                                {isRejected ? 'Reprovada' : 'Aprovada'}
                              </span>
                          </td>
                      )}
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


const TasksView: React.FC<TasksViewProps> = ({ tasks, designers, onAddTask, onAddTasksBulk, onUpdateTask, onDeleteTask, loggedInUser }) => {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeDesigners = Array.isArray(designers) ? designers : [];
  const isDirector = loggedInUser?.role === 'Diretor de Arte';
  const filtersStorageKey = `tasks-view-filters-${loggedInUser?.id ?? 'default'}`;

  let defaultStartDate = '';
  let defaultEndDate = '';
  try {
    const initialWeekRange = getWeekRange(new Date());
    defaultStartDate = toLocalDateString(initialWeekRange.start);
    defaultEndDate = toLocalDateString(initialWeekRange.end);
  } catch {
    const today = new Date();
    defaultStartDate = today.toISOString().slice(0, 10);
    defaultEndDate = today.toISOString().slice(0, 10);
  }

  const defaultFilterDesigner = isDirector ? 'all' : (loggedInUser?.id ?? 'all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
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
  
  const [bulkFormData, setBulkFormData] = useState<Omit<Task, 'id' | 'created_at' | 'value'> & { quantity: number }>({
    ...initialFormState,
    quantity: 1,
  });
  
  const [filterDesigner, setFilterDesigner] = useState<string>(defaultFilterDesigner);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

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
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openBulkModal = () => {
    setBulkFormData({
      ...initialFormState,
      quantity: 1,
    });
    setIsBulkModalOpen(true);
  };

  const closeBulkModal = () => {
    setIsBulkModalOpen(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        const newStartDate = dueDateStr < startDate ? dueDateStr : startDate;
        const newEndDate = dueDateStr > endDate ? dueDateStr : endDate;
        setStartDate(newStartDate);
        setEndDate(newEndDate);
      }
    } else {
      const weekRange = getWeekRange(new Date(dueDateStr));
      setStartDate(toLocalDateString(weekRange.start));
      setEndDate(toLocalDateString(weekRange.end));
    }

    if (editingTask) {
      onUpdateTask(editingTask.id, {
        ...payload,
        value: MEDIA_PRICES[formData.media_type]?.price ?? 0,
        approval_status: formData.approval_status ?? 'approved',
      });
      closeModal();
      return;
    }

    setIsSubmitting(true);
    const success = await onAddTask(payload);
    setIsSubmitting(false);
    if (success) closeModal();
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkFormData.designer_id || !bulkFormData.media_type || !bulkFormData.due_date || bulkFormData.quantity < 1) return;

    const payload = {
      designer_id: bulkFormData.designer_id,
      media_type: bulkFormData.media_type,
      due_date: bulkFormData.due_date,
      artist: bulkFormData.artist || '-',
      social_media: bulkFormData.social_media || '-',
      description: '-',
    };

    if (isDirector && filterDesigner !== 'all' && filterDesigner !== bulkFormData.designer_id) {
      setFilterDesigner(bulkFormData.designer_id);
    }

    const dueDateStr = bulkFormData.due_date;
    if (startDate && endDate) {
      if (dueDateStr < startDate || dueDateStr > endDate) {
        const newStartDate = dueDateStr < startDate ? dueDateStr : startDate;
        const newEndDate = dueDateStr > endDate ? dueDateStr : endDate;
        setStartDate(newStartDate);
        setEndDate(newEndDate);
      }
    } else {
      const weekRange = getWeekRange(new Date(dueDateStr));
      setStartDate(toLocalDateString(weekRange.start));
      setEndDate(toLocalDateString(weekRange.end));
    }

    setIsBulkSubmitting(true);
    const success = await onAddTasksBulk(payload, bulkFormData.quantity);
    setIsBulkSubmitting(false);
    if (success) closeBulkModal();
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
        const date = new Date(dueDate);
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
            <div className="flex items-center gap-3 flex-shrink-0">
              <button 
                onClick={openBulkModal} 
                className="flex items-center bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-emerald-500 transition-smooth shadow-sm"
              >
                <SquaresPlusIcon />
                <span className="ml-2">Adicionar em Massa</span>
              </button>
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
                    : `Semana de ${formatDate(toLocalDateString(group.weekRange.start))} a ${formatDate(toLocalDateString(group.weekRange.end))}`}
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
          <div className="bg-base-100 rounded-2xl shadow-card border border-base-300/40 text-center p-8 text-base-content-secondary">
            Nenhuma demanda encontrada para os filtros selecionados.
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingTask ? 'Editar Demanda' : 'Adicionar Nova Demanda'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {isDirector && (
            <div>
                <label className="block text-sm font-medium text-base-content-secondary mb-1">Designer</label>
                <select value={formData.designer_id} onChange={e => setFormData({ ...formData, designer_id: e.target.value })} className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none" required>
                <option value="">Selecione um designer</option>
                {safeDesigners.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
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
                <option value="rejected">Reprovada (paga metade)</option>
              </select>
            </div>
          )}
          <div className="flex justify-end pt-4 sticky bottom-0 bg-base-100 pb-2">
            <button type="submit" disabled={isSubmitting} className="bg-brand-primary text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-brand-secondary transition-smooth shadow-brand disabled:opacity-60 disabled:cursor-not-allowed">
              {isSubmitting ? 'Salvando...' : (editingTask ? 'Salvar Alterações' : 'Adicionar')}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isBulkModalOpen} onClose={closeBulkModal} title="Adicionar Demandas em Massa">
        <form onSubmit={handleBulkSubmit} className="space-y-4">
          <div className="bg-blue-900/20 border border-blue-500/40 rounded-xl p-3 mb-4">
            <p className="text-sm text-blue-300">
              <strong>Como usar:</strong> Preencha os dados abaixo e especifique a quantidade. Serão criadas múltiplas demandas idênticas com os mesmos parâmetros.
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Designer</label>
            <select 
              value={bulkFormData.designer_id} 
              onChange={e => setBulkFormData({ ...bulkFormData, designer_id: e.target.value })} 
              className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none" 
              required
            >
              <option value="">Selecione um designer</option>
              {safeDesigners.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Tipo de Mídia</label>
            <select 
              value={bulkFormData.media_type} 
              onChange={e => setBulkFormData({ ...bulkFormData, media_type: e.target.value })} 
              className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none" 
              required
            >
              <option value="">Selecione um tipo</option>
              {Object.entries(MEDIA_PRICES).map(([key, media]) => (
                <option key={key} value={key}>
                  {media.name} - {formatCurrency(media.price)}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Data de Entrega</label>
            <input 
              type="date" 
              value={bulkFormData.due_date} 
              onChange={e => setBulkFormData({ ...bulkFormData, due_date: e.target.value })} 
              className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none" 
              required 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Quantidade</label>
            <input 
              type="number" 
              min="1" 
              max="100" 
              value={bulkFormData.quantity} 
              onChange={e => setBulkFormData({ ...bulkFormData, quantity: parseInt(e.target.value) || 1 })} 
              className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none" 
              required 
            />
            <p className="text-xs text-base-content-secondary mt-1">
              Número de demandas idênticas a serem criadas (máximo: 100)
            </p>
          </div>
          
          <div className="bg-base-200/50 rounded-xl p-3 mt-4">
            <p className="text-sm text-base-content-secondary">
              <strong>Resumo:</strong> Serão criadas <strong className="text-base-content">{bulkFormData.quantity}</strong> demanda(s) do tipo <strong className="text-base-content">{bulkFormData.media_type || 'N/A'}</strong> para <strong className="text-base-content">{bulkFormData.designer_id ? safeDesigners.find(d => d.id === bulkFormData.designer_id)?.name || 'N/A' : 'N/A'}</strong> com entrega em <strong className="text-base-content">{bulkFormData.due_date || 'N/A'}</strong>.
            </p>
          </div>
          
          <div className="flex justify-end pt-4 sticky bottom-0 bg-base-100 pb-2">
            <button 
              type="submit" 
              className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-emerald-500 transition-smooth shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={!bulkFormData.designer_id || !bulkFormData.media_type || !bulkFormData.due_date || bulkFormData.quantity < 1 || isBulkSubmitting}
            >
              {isBulkSubmitting ? 'Salvando...' : `Adicionar ${bulkFormData.quantity} Demanda(s)`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TasksView;
