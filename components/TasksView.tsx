import React, { useState, useMemo } from 'react';
import { Designer, Task, Artist } from '../types';
import { MEDIA_PRICES } from '../constants';
import { formatDate, formatCurrency, getWeekRange, toLocalDateString } from '../utils/dateUtils';
import Modal from './Modal';
import { PlusIcon, ClockIcon, PencilIcon, TrashIcon } from './icons/Icons';

interface TasksViewProps {
  tasks: Task[];
  designers: Designer[];
  artists: Artist[];
  onAddTask: (taskData: Omit<Task, 'id' | 'createdDate' | 'value'>) => void;
  onUpdateTask: (taskData: Task) => void;
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
                          <p className="text-sm text-base-content-secondary">{task.description}</p>
                          <p className="text-xs text-base-content-secondary mt-1">
                              <span className="font-medium">Mídia:</span> {task.mediaType} | <span className="font-medium">Solicitante:</span> {task.socialMedia}
                          </p>
                      </td>
                      <td className="p-4 text-base-content-secondary align-top">{designerMap.get(task.designerId) || 'N/A'}</td>
                      <td className="p-4 text-base-content-secondary align-top">{formatDate(task.dueDate)}</td>
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


const TasksView: React.FC<TasksViewProps> = ({ tasks, designers, artists, onAddTask, onUpdateTask, onDeleteTask, loggedInUser, submissionWindowOpen }) => {
  const isDirector = loggedInUser.role === 'Diretor de Arte';
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const initialFormState: Omit<Task, 'id' | 'createdDate' | 'value'> = { 
    description: '', 
    designerId: isDirector ? '' : loggedInUser.id, 
    mediaType: '', 
    dueDate: '', 
    artist: '', 
    socialMedia: '' 
  };
  const [formData, setFormData] = useState<Omit<Task, 'id' | 'createdDate' | 'value'>>(initialFormState);
  
  const [filterDesigner, setFilterDesigner] = useState<string>(isDirector ? 'all' : loggedInUser.id);
  
  const designerMap = useMemo(() => new Map(designers.map(d => [d.id, d.name])), [designers]);

  const openAddModal = () => {
    setEditingTask(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({
      description: task.description,
      designerId: task.designerId,
      mediaType: task.mediaType,
      dueDate: task.dueDate.split('T')[0],
      artist: task.artist,
      socialMedia: task.socialMedia,
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
    if (formData.description && formData.designerId && formData.mediaType && formData.dueDate && formData.artist && formData.socialMedia) {
      if (editingTask) {
        onUpdateTask({
          ...editingTask,
          ...formData,
          value: MEDIA_PRICES[formData.mediaType]?.price || 0,
        });
      } else {
        onAddTask(formData);
      }
      closeModal();
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const designerMatch = filterDesigner === 'all' || task.designerId === filterDesigner;
      return designerMatch;
    }).sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
  }, [tasks, filterDesigner]);
  
  const groupedTasks = useMemo(() => {
    const groups: Record<string, { weekRange: { start: Date, end: Date }, tasks: Task[] }> = {};
    
    filteredTasks.forEach(task => {
        const weekRange = getWeekRange(new Date(task.createdDate));
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

      <div className="flex space-x-4">
        {isDirector && (
          <select value={filterDesigner} onChange={e => setFilterDesigner(e.target.value)} className="p-2 border rounded-lg bg-base-100 border-base-300 focus:ring-brand-primary focus:border-brand-primary">
            <option value="all">Todos os Designers</option>
            {designers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
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
            Nenhuma demanda encontrada.
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingTask ? 'Editar Demanda' : 'Adicionar Nova Demanda'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Artista</label>
             <select value={formData.artist} onChange={e => setFormData({ ...formData, artist: e.target.value })} className="w-full p-2 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary" required>
              <option value="">Selecione um artista</option>
              {artists.sort((a,b) => a.name.localeCompare(b.name)).map(artist => <option key={artist.id} value={artist.name}>{artist.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Social Media que solicitou</label>
            <input type="text" value={formData.socialMedia} onChange={e => setFormData({ ...formData, socialMedia: e.target.value })} className="w-full p-2 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary" required />
          </div>
          {isDirector && (
            <div>
                <label className="block text-sm font-medium text-base-content-secondary mb-1">Designer</label>
                <select value={formData.designerId} onChange={e => setFormData({ ...formData, designerId: e.target.value })} className="w-full p-2 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary" required>
                <option value="">Selecione um designer</option>
                {designers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Tipo de Mídia</label>
            <select value={formData.mediaType} onChange={e => setFormData({ ...formData, mediaType: e.target.value })} className="w-full p-2 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary" required>
              <option value="">Selecione um tipo</option>
              {Object.entries(MEDIA_PRICES).map(([key, media]) => <option key={key} value={key}>{media.name} - {formatCurrency(media.price)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Descrição do que foi feito</label>
            <input type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full p-2 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Data de Entrega</label>
            <input type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} className="w-full p-2 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary" required />
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