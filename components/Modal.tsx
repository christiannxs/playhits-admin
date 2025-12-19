
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-base-100 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-base-300 pb-3 mb-4 p-6 pb-4 flex-shrink-0">
          <h3 className="text-xl font-bold text-base-content">{title}</h3>
          <button onClick={onClose} className="text-base-content-secondary hover:text-base-content text-2xl leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto px-6 pb-6 flex-1">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
