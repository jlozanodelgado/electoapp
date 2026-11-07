import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  subtitle?: string;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  headerAction,
  footer,
}) => {
  return (
    <div className={`bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-xl shadow-xl overflow-hidden ${className}`}>
      {(title || headerAction) && (
        <div className="px-4 py-3.5 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            {typeof title === 'string' ? (
              <h3 className="font-semibold text-slate-100 text-sm tracking-wide">{title}</h3>
            ) : (
              title
            )}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
      {footer && <div className="px-4 py-3 border-t border-slate-800/80 bg-slate-950/40">{footer}</div>}
    </div>
  );
};

