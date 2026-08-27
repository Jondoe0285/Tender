import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={`rounded-card border border-slate-200 bg-white p-6 shadow-soft ${
        interactive ? 'transition-all duration-150 hover:-translate-y-0.5 hover:border-steel-blue/40 hover:shadow-soft-md' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
