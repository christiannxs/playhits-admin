import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, className = '' }) => (
  <div
    className={`flex flex-col items-center justify-center py-12 px-6 rounded-2xl border-2 border-dashed border-base-300 bg-base-200/20 text-center ${className}`}
    role="status"
    aria-label={title}
  >
    {icon && (
      <div className="text-base-content-secondary/50 mb-3 flex justify-center [&>svg]:h-10 [&>svg]:w-10">
        {icon}
      </div>
    )}
    <p className="font-medium text-base-content-secondary">{title}</p>
    {description && <p className="text-sm text-base-content-secondary/80 mt-1 max-w-sm">{description}</p>}
  </div>
);

export default EmptyState;
