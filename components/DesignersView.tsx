

import React, { useState, useMemo } from 'react';
import { Designer, DesignerType, Advance, Task } from '../types';
import { formatCurrency, formatDate, getWeekRange, getMonthRange, toLocalDateString, getTaskPayableValue, isTaskInPeriod } from '../utils/dateUtils';
import Modal from './Modal';
import { SearchIcon, PencilIcon, CashIcon, TrashIcon, PlusIcon, UsersIcon } from './icons/Icons';

interface DesignersViewProps {
  designers: Designer[];
  tasks: Task[];
  onAddDesigner: (designerData: any) => Promise<{ success: boolean; message: string }>;
  onUpdateDesigner: (designerData: Designer) => void;
  onDeleteDesigner: (designerId: string) => void;
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
    onDelete: (designer: Designer) => void;
}> = ({ designer, tasks, advances, onEdit, onManageAdvances, onDelete }) => {
    const today = new Date();
    let balance = 0;
    let periodLabel = '';
    let productionValue: number | null = null;
    let productionLabel = '';

    if (designer.type === DesignerType.Fixed) {
        const monthRange = getMonthRange(today);
        
        const advancesInPeriod = advances.filter(adv =>
            adv.designer_id === designer.id &&
            new Date(adv.date) >= monthRange.start &&
            new Date(adv.date) <= monthRange.end
        );
        const advancesTotal = advancesInPeriod.reduce((sum, adv) => sum + adv.amount, 0);
        
        balance = (designer.salary || 0) - advancesTotal;
        periodLabel = 'Pagamento do Mês';

        const tasksInMonth = tasks.filter(task => 
            task.designer_id === designer.id &&
            new Date(task.created_at) >= monthRange.start &&
            new Date(task.created_at) <= monthRange.end
        );
        productionValue = tasksInMonth.reduce((sum, task) => sum + getTaskPayableValue(task), 0);
        productionLabel = 'Produção do Mês';
        
    } else { // Freelancer - semana pela data de entrega (due_date)
        const weekRange = getWeekRange(today);
        const tasksInPeriod = tasks.filter(task =>
            task.designer_id === designer.id &&
            isTaskInPeriod(task, weekRange.start, weekRange.end)
        );
        const taskTotal = tasksInPeriod.reduce((sum, task) => sum + getTaskPayableValue(task), 0);

        const advancesInPeriod = advances.filter(adv =>
            adv.designer_id === designer.id &&
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
        <div className="section-card bg-base-100/90 backdrop-blur-sm p-5 rounded-2xl flex flex-col justify-between h-full transition-smooth">
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

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                    {designer.type === DesignerType.Fixed
                        ? <span className="px-3 py-1 text-xs font-semibold text-indigo-300 bg-indigo-500/20 rounded-full">Fixo</span>
                        : <span className="px-3 py-1 text-xs font-semibold text-teal-300 bg-teal-500/20 rounded-full">Freelancer</span>
                    }
                    {designer.type === DesignerType.Fixed && !designer.auth_user_id && (
                        <span className="px-2 py-0.5 text-xs font-medium text-amber-300 bg-amber-500/20 rounded-full" title="Não acessa o painel; apenas aparece em demandas e relatório">Sem login</span>
                    )}
                </div>
                <div className="flex items-center space-x-1">
                    <button onClick={() => onManageAdvances(designer)} className="p-2 rounded-full text-base-content-secondary hover:bg-base-300 hover:text-base-content transition-colors" title="Gerenciar Vales/Adiantamentos">
                        <CashIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => onEdit(designer)} className="p-2 rounded-full text-base-content-secondary hover:bg-base-300 hover:text-base-content transition-colors" title="Editar Designer">
                        <PencilIcon />
                    </button>
                    <button onClick={() => onDelete(designer)} className="p-2 rounded-full text-base-content-secondary hover:bg-red-900/50 hover:text-red-500 transition-colors" title="Remover Designer">
                        <TrashIcon />
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
    .filter(adv => adv.designer_id === designer.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!isNaN(numericAmount) && numericAmount > 0 && description && date) {
      onAddAdvance({
        designer_id: designer.id,
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
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-base-content-secondary mb-1">Valor (R$)</label>
                    <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Ex: 50.00" className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-base-content-secondary mb-1">Motivo/Descrição</label>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Adiantamento semanal" className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none" required />
                </div>
                <div className="text-right">
                    <button type="submit" className="bg-brand-primary text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-brand-secondary transition-smooth shadow-brand text-sm">Adicionar</button>
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


const DesignersView: React.FC<DesignersViewProps> = ({ designers, tasks, onAddDesigner, onUpdateDesigner, onDeleteDesigner, advances, onAddAdvance, onDeleteAdvance }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDesigner, setEditingDesigner] = useState<Designer | null>(null);
  
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [selectedDesignerForAdvance, setSelectedDesignerForAdvance] = useState<Designer | null>(null);

  const initialAddFormState = { name: '', username: '', email: '', password: '', confirmPassword: '', role: 'Designer', type: DesignerType.Freelancer, salary: 0 };
  const [addFormData, setAddFormData] = useState(initialAddFormState);
  const [editFormData, setEditFormData] = useState<Partial<Designer>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [addFormError, setAddFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAddModal = () => {
    setEditingDesigner(null);
    setAddFormData(initialAddFormState);
    setAddFormError('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (designer: Designer) => {
    setEditingDesigner(designer);
    setEditFormData({
        name: designer.name,
        role: designer.role,
        type: designer.type ?? DesignerType.Freelancer,
        salary: designer.salary ?? 0,
    });
    setIsEditModalOpen(true);
  };
  
  const openAdvanceModal = (designer: Designer) => {
    setSelectedDesignerForAdvance(designer);
    setIsAdvanceModalOpen(true);
  };

  const closeEditModal = () => setIsEditModalOpen(false);
  const closeAddModal = () => setIsAddModalOpen(false);
  const closeAdvanceModal = () => setIsAdvanceModalOpen(false);

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDesigner) return;

    const dataToSubmit: Designer = { 
        ...editingDesigner,
        name: editFormData.name || editingDesigner.name,
        role: editFormData.role || editingDesigner.role,
        type: editFormData.type || editingDesigner.type,
        salary: editFormData.type === DesignerType.Fixed ? editFormData.salary : undefined,
    };
    
    onUpdateDesigner(dataToSubmit);
    closeEditModal();
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormError('');

    const usernameRegex = /^[a-z0-9_.-]+$/;
    if (!usernameRegex.test(addFormData.username.toLowerCase())) {
      setAddFormError('O nome de usuário deve conter apenas letras minúsculas, números, pontos, underscores ou hifens.');
      return;
    }

    if (addFormData.password !== addFormData.confirmPassword) {
      setAddFormError('As senhas não coincidem.');
      return;
    }
    if (addFormData.password.length < 6) {
        setAddFormError('A senha deve ter pelo menos 6 caracteres.');
        return;
    }

    setIsSubmitting(true);
    const designerData = {
        email: `${addFormData.username.toLowerCase()}@playhits.local`,
        password: addFormData.password,
        name: addFormData.name,
        username: addFormData.username.toLowerCase(),
        role: addFormData.role,
        type: addFormData.type,
        salary: addFormData.type === DesignerType.Fixed ? addFormData.salary : undefined,
    };
    
    const { success, message } = await onAddDesigner(designerData);
    setIsSubmitting(false);

    if (success) {
      closeAddModal();
    } else {
      setAddFormError(message || 'Ocorreu um erro desconhecido.');
    }
  }

  const filteredDesigners = useMemo(() => {
    return designers.filter(designer => 
      designer.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a,b) => a.name.localeCompare(b.name));
  }, [designers, searchQuery]);

  const handleDeleteDesigner = (designer: Designer) => {
    const isFixedNoLogin = designer.type === DesignerType.Fixed && !designer.auth_user_id;
    const msg = isFixedNoLogin
      ? 'Este designer é fixo e não tem login (apenas para demandas e relatório). Remover mesmo assim?'
      : 'Tem certeza que deseja remover este designer? Isso removerá o acesso do usuário e todos os dados associados do painel.';
    if (window.confirm(msg)) onDeleteDesigner(designer.id);
  };

  return (
    <div className="space-y-6">
      <header className="page-header">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="page-header-title flex items-center gap-2">
              <UsersIcon className="h-8 w-8 text-brand-primary hidden sm:block" />
              Equipe
            </h2>
            <p className="page-header-subtitle">Designers, freelancers e equipe fixa</p>
          </div>
          <button onClick={openAddModal} className="flex items-center bg-brand-primary text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-brand-secondary transition-smooth shadow-brand flex-shrink-0">
            <PlusIcon />
            <span className="ml-2">Novo Designer</span>
          </button>
        </div>
      </header>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content-secondary pointer-events-none" />
        <input
            type="text"
            placeholder="Buscar designer por nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2.5 pl-10 pr-4 rounded-xl bg-base-100/90 border border-base-300 text-base-content placeholder-base-content-secondary/60 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none transition-smooth"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredDesigners.length > 0 ? (
          filteredDesigners.map(designer => (
            <DesignerCard 
                key={designer.id} 
                designer={designer} 
                tasks={tasks} 
                advances={advances} 
                onEdit={openEditModal} 
                onManageAdvances={openAdvanceModal} 
                onDelete={handleDeleteDesigner}
            />
          ))
        ) : (
          <p className="text-base-content-secondary col-span-full text-center py-8">Nenhum designer encontrado.</p>
        )}
      </div>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={closeEditModal} title={'Editar Designer'}>
        <form onSubmit={handleUpdateSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Nome Completo</label>
                <input type="text" value={editFormData.name} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Nome de Usuário (não pode ser alterado)</label>
            <input type="text" value={editingDesigner?.username || ''} className="w-full p-3 border rounded-xl bg-base-300 border-base-300 text-base-content-secondary" disabled />
          </div>
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Cargo</label>
             <select value={editFormData.role} onChange={e => setEditFormData({ ...editFormData, role: e.target.value })} className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none" required>
                <option value="Designer">Designer</option>
                <option value="Freelancer">Freelancer</option>
                <option value="Diretor de Arte">Diretor de Arte</option>
                <option value="Financeiro">Financeiro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Tipo de Contrato</label>
            <select value={editFormData.type} onChange={e => setEditFormData({ ...editFormData, type: e.target.value as DesignerType })} className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none" required>
              <option value={DesignerType.Freelancer}>Freelancer</option>
              <option value={DesignerType.Fixed}>Fixo</option>
            </select>
          </div>
          {editFormData.type === DesignerType.Fixed && (
            <div>
                <label className="block text-sm font-medium text-base-content-secondary mb-1">Salário Mensal (R$)</label>
                <input type="number" step="0.01" value={editFormData.salary} onChange={e => setEditFormData({ ...editFormData, salary: parseFloat(e.target.value) || 0 })} className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none" required />
            </div>
          )}
          <div className="flex justify-end pt-4">
            <button type="submit" className="bg-brand-primary text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-brand-secondary transition-smooth shadow-brand">Salvar Alterações</button>
          </div>
        </form>
      </Modal>

      {/* Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={closeAddModal} title="Adicionar Novo Designer">
        <form onSubmit={handleAddSubmit} className="space-y-4">
           <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Nome Completo</label>
            <input type="text" value={addFormData.name} onChange={e => setAddFormData({ ...addFormData, name: e.target.value })} className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none" required />
          </div>
           <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Nome de Usuário (para login)</label>
            <input 
              type="text" 
              value={addFormData.username} 
              onChange={e => setAddFormData({ ...addFormData, username: e.target.value.toLowerCase() })} 
              className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none" 
              required 
              autoCapitalize="none"
            />
             <p className="text-xs text-base-content-secondary mt-1">O email será gerado como `nome.de.usuario@playhits.local`. Use apenas letras minúsculas, números e pontos/hifens.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Senha</label>
            <input type="password" value={addFormData.password} onChange={e => setAddFormData({ ...addFormData, password: e.target.value })} className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none" required />
          </div>
           <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Confirmar Senha</label>
            <input type="password" value={addFormData.confirmPassword} onChange={e => setAddFormData({ ...addFormData, confirmPassword: e.target.value })} className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Cargo</label>
            <select value={addFormData.role} onChange={e => setAddFormData({ ...addFormData, role: e.target.value })} className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none" required>
                <option value="Designer">Designer</option>
                <option value="Freelancer">Freelancer</option>
                <option value="Diretor de Arte">Diretor de Arte</option>
                <option value="Financeiro">Financeiro</option>
            </select>
          </div>
           <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Tipo de Contrato</label>
            <select value={addFormData.type} onChange={e => setAddFormData({ ...addFormData, type: e.target.value as DesignerType })} className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none" required>
              <option value={DesignerType.Freelancer}>Freelancer</option>
              <option value={DesignerType.Fixed}>Fixo</option>
            </select>
          </div>
          {addFormData.type === DesignerType.Fixed && (
            <div>
                <label className="block text-sm font-medium text-base-content-secondary mb-1">Salário Mensal (R$)</label>
                <input type="number" step="0.01" value={addFormData.salary} onChange={e => setAddFormData({ ...addFormData, salary: parseFloat(e.target.value) || 0 })} className="w-full p-3 border rounded-xl bg-base-200 border-base-300 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none" />
            </div>
          )}

          {addFormError && <p className="text-sm text-red-400 text-center bg-red-900/50 p-2 rounded-md">{addFormError}</p>}

          <div className="flex justify-end pt-4">
            <button type="submit" className="bg-brand-primary text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-brand-secondary transition-smooth shadow-brand disabled:opacity-60 disabled:shadow-none" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Designer'}
              </button>
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
