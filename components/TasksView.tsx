import React, { useState, useMemo } from 'react';
import { Designer, Task, UpdateTaskPayload } from '../types';
import { MEDIA_PRICES, ARTIST_LIST } from '../constants';
import { formatDate, formatCurrency, getWeekRange, toLocalDateString } from '../utils/dateUtils';
import Modal from './Modal';
import { PlusIcon, ClockIcon, PencilIcon, TrashIcon } from './icons/Icons';

interface TasksViewProps {
  tasks: Task[];
  designers: Designer[];
  onAddTask: (taskData: Omit<Task, 'id' | 'created_at' | 'value'>) => void;
  onUpdateTask: (taskId: string, taskData: UpdateTaskPayload) => void;
  onDeleteTask: (taskId: string) => void;
  loggedInUser: Designer;
  submissionWindowOpen: boolean;
}

const TaskTable: React.FC<{
  tasks: Task[];
  isDirector: boolean;
  designerMap: Map<string, string>;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}> = ({ tasks, isDirector, designerMap, onEdit, onDelete }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
          <thead className="border-b border-base-300 bg-base-200/50">
              <tr>
                  <th className="p-4 font-semibold text-base-content-secondary">Demanda</th>
                  <th className="p-4 font-semibold text-base-content-secondary">Designer</th>
                  <th className="p-4 font-semibold text-base-content-secondary">Entrega</th>
                  <th className="p-4 font-semibold text-base-content-secondary">Valor</th>
                  {isDirector && <th className="p-4 font-semibold text-base-content-secondary">Ações</th>}
              </tr>
          </thead>
          <tbody>
              {tasks.map(task => (
                  <tr key={task.id} className="border-b border-base-300 hover:bg-base-100/50 last:border-b-0">
                      <td className="p-4 align-top">
                          <p className="font-semibold text-base-content">{task.artist}</p>
                          <p className="text-xs text-base-content-secondary mt-1">
                              <span className="font-medium">Mídia:</span> {task.media_type} | <span className="font-medium">Solicitante:</span> {task.social_media}
                          </p>
                          {task.description && (
                            <p className="text-xs text-base-content-secondary/80 mt-1 italic whitespace-pre-wrap">
                                {task.description}
                            </p>
                          )}
                      </td>
                      <td className="p-4 text-base-content-secondary align-top">{designerMap.get(task.designer_id) || 'N/A'}</td>
                      <td className="p-4 text-base-content-secondary align-top">{formatDate(task.due_date)}</td>
                      <td className="p-4 font-semibold text-base-content align-top">{formatCurrency(task.value)}</td>
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
              ))}
          </tbody>
      </table>
    </div>
);


const TasksView: React.FC<TasksViewProps> = ({ tasks, designers, onAddTask, onUpdateTask, onDeleteTask, loggedInUser, submissionWindowOpen }) => {
  const isDirector = loggedInUser.role === 'Diretor de Arte';
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const initialFormState: Omit<Task, 'id' | 'created_at' | 'value'> = { 
    designer_id: isDirector ? '' : loggedInUser.id, 
    media_type: '', 
    due_date: '', 
    artist: '', 
    social_media: '',
    description: '',
  };
  const [formData, setFormData] = useState<Omit<Task, 'id' | 'created_at' | 'value'>>(initialFormState);
  
  const [filterDesigner, setFilterDesigner] = useState<string>(isDirector ? 'all' : loggedInUser.id);
  
  const initialWeekRange = getWeekRange(new Date());
  const [startDate, setStartDate] = useState<string>(toLocalDateString(initialWeekRange.start));
  const [endDate, setEndDate] = useState<string>(toLocalDateString(initialWeekRange.end));
  
  const designerMap = useMemo(() => new Map(designers.map(d => [d.id, d.name])), [designers]);

  const openAddModal = () => {
    setEditingTask(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({
      designer_id: task.designer_id,
      media_type: task.media_type,
      due_date: task.due_date.split('T')[0],
      artist: task.artist,
      social_media: task.social_media,
      description: task.description || '',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.designer_id && formData.media_type && formData.due_date && formData.artist && formData.social_media) {
      const payload = {
        ...formData,
        value: MEDIA_PRICES[formData.media_type]?.price || 0,
      };

      if (editingTask) {
        onUpdateTask(editingTask.id, payload);
      } else {
        onAddTask(payload);
      }
      closeModal();
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const designerMatch = filterDesigner === 'all' || task.designer_id === filterDesigner;

      const dateMatch = (() => {
        if (!startDate || !endDate) {
          return true; // Don't filter if dates aren't set
        }
        
        const taskDueDate = task.due_date.substring(0, 10);
        
        // Lexicographical comparison works for 'YYYY-MM-DD' format.
        return taskDueDate >= startDate && taskDueDate <= endDate;
      })();

      return designerMatch && dateMatch;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [tasks, filterDesigner, startDate, endDate]);
  
  const groupedTasks = useMemo(() => {
    const groups: Record<string, { weekRange: { start: Date, end: Date }, tasks: Task[] }> = {};
    
    filteredTasks.forEach(task => {
        // FIX: Group tasks by the week of their *due date*, not their creation date,
        // to align the grouping with the date filtering logic.
        const weekRange = getWeekRange(new Date(task.due_date));
        const weekKey = toLocalDateString(weekRange.start);
        if (!groups[weekKey]) {
            groups[weekKey] = { weekRange, tasks: [] };
        }
        groups[weekKey].tasks.push(task);
    });

    return groups;
  }, [filteredTasks]);

  const canAddTask = isDirector || submissionWindowOpen;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-base-content">Demandas</h2>
        <button 
          onClick={openAddModal} 
          className="flex items-center bg-brand-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-secondary transition-colors shadow-sm disabled:bg-base-300 disabled:cursor-not-allowed"
          disabled={!canAddTask}
          title={!canAddTask ? 'O período para adicionar demandas está fechado' : 'Adicionar nova demanda'}
        >
          <PlusIcon />
          <span className="ml-2">Nova Demanda</span>
        </button>
      </div>
      
      {!isDirector && (
        <div className={`p-4 rounded-lg shadow-md flex items-center space-x-4 ${submissionWindowOpen ? 'bg-green-900/50 border border-green-500' : 'bg-yellow-900/50 border border-yellow-500'}`}>
            <div className={`p-2 rounded-full ${submissionWindowOpen ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
                <ClockIcon className={`h-6 w-6 ${submissionWindowOpen ? 'text-green-400' : 'text-yellow-400'}`} />
            </div>
            <div>
                <h4 className="font-bold text-base-content">
                    {submissionWindowOpen ? 'Período de Envio Aberto' : 'Período de Envio Fechado'}
                </h4>
                <p className={`text-sm ${submissionWindowOpen ? 'text-green-300' : 'text-yellow-300'}`}>
                    {submissionWindowOpen 
                        ? 'Você pode adicionar novas demandas para o pagamento desta semana.' 
                        : 'Aguarde o diretor abrir o período de envios para adicionar novas demandas.'}
                </p>
            </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 bg-base-100 p-4 rounded-2xl shadow-md">
        <span className="font-semibold text-base-content-secondary">Filtros:</span>
        {isDirector && (
          <select value={filterDesigner} onChange={e => setFilterDesigner(e.target.value)} className="p-2 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary">
            <option value="all">Todos os Designers</option>
            {designers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
        <div className="flex items-center gap-2">
            <label htmlFor="start-date" className="text-sm font-medium text-base-content-secondary">Entrega de:</label>
            <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="p-2 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary"
            />
        </div>
        <div className="flex items-center gap-2">
            <label htmlFor="end-date" className="text-sm font-medium text-base-content-secondary">Até:</label>
            <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="p-2 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary"
            />
        </div>
        <button 
          onClick={() => { setStartDate(''); setEndDate(''); }}
          className="px-3 py-2 text-sm text-base-content-secondary hover:bg-base-300 rounded-lg transition-colors"
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
              <details key={weekKey} className="bg-base-100 rounded-2xl shadow-md overflow-hidden" open>
                <summary className="p-4 font-bold text-lg cursor-pointer hover:bg-base-200/50 list-inside">
                  Semana de {formatDate(group.weekRange.start.toISOString())} a {formatDate(group.weekRange.end.toISOString())}
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
          <div className="bg-base-100 rounded-2xl shadow-md text-center p-8 text-base-content-secondary">
            Nenhuma demanda encontrada para os filtros selecionados.
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingTask ? 'Editar Demanda' : 'Adicionar Nova Demanda'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Artista</label>
            <select
              value={formData.artist}
              onChange={e => setFormData({ ...formData, artist: e.target.value })}
              className="w-full p-2 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary"
              required
            >
              <option value="">Selecione um artista</option>
              {ARTIST_LIST.sort((a, b) => a.localeCompare(b)).map(artist => (
                <option key={artist} value={artist}>{artist}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Social Media que solicitou</label>
            <input type="text" value={formData.social_media} onChange={e => setFormData({ ...formData, social_media: e.target.value })} className="w-full p-2 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Descrição da Demanda</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Ex: Criar arte para post de Instagram sobre o novo single..."
              className="w-full p-2 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary"
            ></textarea>
          </div>
          {isDirector && (
            <div>
                <label className="block text-sm font-medium text-base-content-secondary mb-1">Designer</label>
                <select value={formData.designer_id} onChange={e => setFormData({ ...formData, designer_id: e.target.value })} className="w-full p-2 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary" required>
                <option value="">Selecione um designer</option>
                {designers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Tipo de Mídia</label>
            <select value={formData.media_type} onChange={e => setFormData({ ...formData, media_type: e.target.value })} className="w-full p-2 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary" required>
              <option value="">Selecione um tipo</option>
              {Object.entries(MEDIA_PRICES).map(([key, media]) => <option key={key} value={key}>{media.name} - {formatCurrency(media.price)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Data de Entrega</label>
            <input type="date" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} className="w-full p-2 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary" required />
          </div>
          <div className="flex justify-end pt-4">
            <button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-secondary transition-colors">{editingTask ? 'Salvar Alterações' : 'Salvar Demanda'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TasksView;