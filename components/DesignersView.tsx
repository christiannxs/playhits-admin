import React, { useState, useMemo } from 'react';
import { Designer, DesignerType, Advance, Task } from '../types';
import { formatCurrency, formatDate, getWeekRange, getMonthRange, toLocalDateString } from '../utils/dateUtils';
import Modal from './Modal';
import { PlusIcon, SearchIcon, PencilIcon, CashIcon, TrashIcon } from './icons/Icons';

interface DesignersViewProps {
  designers: Designer[];
  tasks: Task[];
  onAddDesigner: (designerData: Omit<Designer, 'id'>) => void;
  onUpdateDesigner: (designerData: Designer) => void;
  advances: Advance[];
  onAddAdvance: (advanceData: Omit<Advance, 'id'>) => void;
  onDeleteAdvance: (advanceId: string) => void;
}

const DesignerCard: React.FC<{ 
    designer: Designer;
    tasks: Task[];
    advances: Advance[];
    onEdit: (designer: Designer) => void; 
    onManageAdvances: (designer: Designer) => void;
}> = ({ designer, tasks, advances, onEdit, onManageAdvances }) => {
    const today = new Date();
    let balance = 0;
    let periodLabel = '';
    let productionValue: number | null = null;
    let productionLabel = '';

    if (designer.type === DesignerType.Fixed) {
        const monthRange = getMonthRange(today);
        
        const advancesInPeriod = advances.filter(adv =>
            adv.designerId === designer.id &&
            new Date(adv.date) >= monthRange.start &&
            new Date(adv.date) <= monthRange.end
        );
        const advancesTotal = advancesInPeriod.reduce((sum, adv) => sum + adv.amount, 0);
        
        balance = (designer.salary || 0) - advancesTotal;
        periodLabel = 'Pagamento do Mês';

        const tasksInMonth = tasks.filter(task => 
            task.designerId === designer.id &&
            new Date(task.createdDate) >= monthRange.start &&
            new Date(task.createdDate) <= monthRange.end
        );
        productionValue = tasksInMonth.reduce((sum, task) => sum + task.value, 0);
        productionLabel = 'Produção do Mês';
        
    } else { // Freelancer
        const weekRange = getWeekRange(today);
        const tasksInPeriod = tasks.filter(task => 
            task.designerId === designer.id &&
            new Date(task.createdDate) >= weekRange.start &&
            new Date(task.createdDate) <= weekRange.end
        );
        const taskTotal = tasksInPeriod.reduce((sum, task) => sum + task.value, 0);

        const advancesInPeriod = advances.filter(adv =>
            adv.designerId === designer.id &&
            new Date(adv.date) >= weekRange.start &&
            new Date(adv.date) <= weekRange.end
        );
        const advancesTotal = advancesInPeriod.reduce((sum, adv) => sum + adv.amount, 0);
        
        balance = taskTotal - advancesTotal;
        periodLabel = 'Pagamento da Semana';
        productionValue = taskTotal;
        productionLabel = 'Produção da Semana';
    }

    const balanceColor = balance < 0 ? 'text-red-400' : 'text-green-400';

    return (
        <div className="bg-base-100 p-5 rounded-xl shadow-md flex flex-col justify-between h-full">
            <div>
                <h4 className="text-lg font-bold text-base-content">{designer.name}</h4>
                <p className="text-sm text-base-content-secondary">{designer.role}</p>
            </div>

            <div className="mt-4 border-t border-base-300 pt-3 space-y-3">
                {productionValue !== null && (
                     <div>
                        <p className="text-xs text-base-content-secondary">{productionLabel}</p>
                        <p className={`text-xl font-bold text-blue-400`}>{formatCurrency(productionValue)}</p>
                    </div>
                )}
                <div>
                    <p className="text-xs text-base-content-secondary">{periodLabel}</p>
                    <p className={`text-xl font-bold ${balanceColor}`}>{formatCurrency(balance)}</p>
                </div>
            </div>

            <div className="mt-4 flex justify-between items-center">
                {designer.type === DesignerType.Fixed
                    ? <span className="px-3 py-1 text-xs font-semibold text-indigo-300 bg-indigo-500/20 rounded-full">Fixo</span>
                    : <span className="px-3 py-1 text-xs font-semibold text-teal-300 bg-teal-500/20 rounded-full">Freelancer</span>
                }
                <div className="flex items-center space-x-1">
                    <button onClick={() => onManageAdvances(designer)} className="p-2 rounded-full text-base-content-secondary hover:bg-base-300 hover:text-base-content transition-colors" title="Gerenciar Vales/Adiantamentos">
                        <CashIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => onEdit(designer)} className="p-2 rounded-full text-base-content-secondary hover:bg-base-300 hover:text-base-content transition-colors" title="Editar Designer">
                        <PencilIcon />
                    </button>
                </div>
            </div>
        </div>
    );
};


const AdvanceModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  designer: Designer | null;
  advances: Advance[];
  onAddAdvance: (data: Omit<Advance, 'id'>) => void;
  onDeleteAdvance: (id: string) => void;
}> = ({ isOpen, onClose, designer, advances, onAddAdvance, onDeleteAdvance }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(toLocalDateString(new Date()));

  if (!isOpen || !designer) return null;

  const designerAdvances = advances
    .filter(adv => adv.designerId === designer.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!isNaN(numericAmount) && numericAmount > 0 && description && date) {
      onAddAdvance({
        designerId: designer.id,
        amount: numericAmount,
        description,
        date: date, // Pass YYYY-MM-DD string directly
      });
      setAmount('');
      setDescription('');
      setDate(toLocalDateString(new Date()));
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Vales e Adiantamentos de ${designer.name}`}>
        <div className="space-y-4">
            <form onSubmit={handleAdd} className="p-4 bg-base-200/50 rounded-lg space-y-3">
                <h4 className="font-semibold text-base-content">Adicionar Novo Vale</h4>
                 <div>
                    <label className="block text-sm font-medium text-base-content-secondary mb-1">Data</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-base-content-secondary mb-1">Valor (R$)</label>
                    <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Ex: 50.00" className="w-full p-2 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-base-content-secondary mb-1">Motivo/Descrição</label>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Adiantamento semanal" className="w-full p-2 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary" required />
                </div>
                <div className="text-right">
                    <button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-secondary transition-colors text-sm">Adicionar</button>
                </div>
            </form>

            <div>
                <h4 className="font-semibold text-base-content mb-2">Histórico</h4>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                {designerAdvances.length > 0 ? (
                    designerAdvances.map(adv => (
                    <div key={adv.id} className="bg-base-200/50 p-3 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-semibold">{formatCurrency(adv.amount)}</p>
                            <p className="text-sm text-base-content-secondary">{adv.description}</p>
                            <p className="text-xs text-base-content-secondary/70">{formatDate(adv.date)}</p>
                        </div>
                        <button onClick={() => onDeleteAdvance(adv.id)} className="p-2 text-base-content-secondary hover:text-red-500 transition-colors">
                            <TrashIcon />
                        </button>
                    </div>
                    ))
                ) : (
                    <p className="text-base-content-secondary text-center p-4">Nenhum adiantamento registrado.</p>
                )}
                </div>
            </div>
        </div>
    </Modal>
  )
}


const DesignersView: React.FC<DesignersViewProps> = ({ designers, tasks, onAddDesigner, onUpdateDesigner, advances, onAddAdvance, onDeleteAdvance }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDesigner, setEditingDesigner] = useState<Designer | null>(null);
  
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [selectedDesignerForAdvance, setSelectedDesignerForAdvance] = useState<Designer | null>(null);

  const initialFormState: Omit<Designer, 'id'> = { name: '', username: '', role: '', type: DesignerType.Freelancer, salary: 0, password: 'playhits2025' };
  const [formData, setFormData] = useState<Omit<Designer, 'id'>>(initialFormState);
  const [searchQuery, setSearchQuery] = useState('');

  const openAddModal = () => {
    setEditingDesigner(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (designer: Designer) => {
    setEditingDesigner(designer);
    setFormData({
        name: designer.name,
        username: designer.username,
        role: designer.role,
        type: designer.type,
        salary: designer.salary || 0,
        password: designer.password || 'playhits2025',
    });
    setIsModalOpen(true);
  };
  
  const openAdvanceModal = (designer: Designer) => {
    setSelectedDesignerForAdvance(designer);
    setIsAdvanceModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };
  
  const closeAdvanceModal = () => {
    setIsAdvanceModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSubmit: Partial<Designer> = { ...formData };
    if (dataToSubmit.type === DesignerType.Freelancer) {
      delete dataToSubmit.salary;
    }

    if (editingDesigner) {
      onUpdateDesigner({ ...editingDesigner, ...dataToSubmit });
    } else {
      onAddDesigner(dataToSubmit as Omit<Designer, 'id'>);
    }
    
    setIsModalOpen(false);
  };

  const filteredDesigners = useMemo(() => {
    return designers.filter(designer => 
      designer.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [designers, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-base-content">Equipe</h2>
        <button onClick={openAddModal} className="flex items-center bg-brand-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-secondary transition-colors shadow-sm">
          <PlusIcon />
          <span className="ml-2">Novo Designer</span>
        </button>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content-secondary" />
        <input
            type="text"
            placeholder="Buscar designer por nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 pl-10 border rounded-lg bg-base-100 border-base-300 focus:ring-brand-primary focus:border-brand-primary"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredDesigners.length > 0 ? (
          filteredDesigners.map(designer => (
            <DesignerCard key={designer.id} designer={designer} tasks={tasks} advances={advances} onEdit={openEditModal} onManageAdvances={openAdvanceModal} />
          ))
        ) : (
          <p className="text-base-content-secondary col-span-full text-center py-8">Nenhum designer encontrado.</p>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingDesigner ? 'Editar Designer' : 'Adicionar Novo Designer'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Nome Completo</label>
            <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-2 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Nome de Usuário</label>
            <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full p-2 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Senha</label>
            <input type="text" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full p-2 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Cargo</label>
            <input type="text" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full p-2 border rounded-lg bg-base-200 border-base-300" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Tipo de Contrato</label>
            <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as DesignerType })} className="w-full p-2 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary" required>
              <option value={DesignerType.Freelancer}>Freelancer</option>
              <option value={DesignerType.Fixed}>Fixo</option>
            </select>
          </div>
          {formData.type === DesignerType.Fixed && (
            <div>
                <label className="block text-sm font-medium text-base-content-secondary mb-1">Salário Mensal (R$)</label>
                <input type="number" step="0.01" value={formData.salary} onChange={e => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })} className="w-full p-2 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary" required />
            </div>
          )}
          <div className="flex justify-end pt-4">
            <button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-secondary transition-colors">{editingDesigner ? 'Salvar Alterações' : 'Salvar Designer'}</button>
          </div>
        </form>
      </Modal>

      <AdvanceModal 
        isOpen={isAdvanceModalOpen}
        onClose={closeAdvanceModal}
        designer={selectedDesignerForAdvance}
        advances={advances}
        onAddAdvance={onAddAdvance}
        onDeleteAdvance={onDeleteAdvance}
      />
    </div>
  );
};

export default DesignersView;