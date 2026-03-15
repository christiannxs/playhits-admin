
import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Classe opcional para o container do conteúdo (ex.: max-w-4xl para formulários largos). */
  contentClassName?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, contentClassName }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && contentRef.current) {
      const focusable = contentRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={contentRef}
        className={`bg-base-100 rounded-3xl shadow-card-hover border border-base-300/40 w-full max-h-[90vh] flex flex-col animate-fade-in ${contentClassName ?? 'max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-base-300/40 px-6 py-4 flex-shrink-0">
          <h3 id="modal-title" className="text-xl font-bold text-base-content">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl text-base-content-secondary hover:text-base-content hover:bg-base-200 transition-smooth text-xl leading-none"
            aria-label="Fechar modal"
          >
            &times;
          </button>
        </div>
        <div className="overflow-y-auto custom-scrollbar px-6 py-5 pb-6 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
