
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black/70 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div className="bg-base-100 rounded-3xl shadow-card-hover border border-base-300/40 w-full max-w-lg max-h-[90vh] flex flex-col animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-base-300/40 px-6 py-4 flex-shrink-0">
          <h3 className="text-xl font-bold text-base-content">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-xl text-base-content-secondary hover:text-base-content hover:bg-base-200 transition-smooth text-xl leading-none" aria-label="Fechar">&times;</button>
        </div>
        <div className="overflow-y-auto custom-scrollbar px-6 pb-6 flex-1">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
