import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, className = '' }) => (
  <div
    className={`flex flex-col items-center justify-center py-14 px-6 rounded-2xl border-2 border-dashed border-base-300/60 bg-base-200/30 text-center transition-smooth ${className}`}
    role="status"
    aria-label={title}
  >
    {icon && (
      <div className="text-base-content-secondary/50 mb-4 flex justify-center [&>svg]:h-10 [&>svg]:w-10">
        {icon}
      </div>
    )}
    <p className="font-medium text-base-content-secondary">{title}</p>
    {description && <p className="text-sm text-base-content-secondary/80 mt-1.5 max-w-sm">{description}</p>}
  </div>
);

export default EmptyState;
