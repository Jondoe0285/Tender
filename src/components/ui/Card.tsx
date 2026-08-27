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
        interactive ? 'transition-shadow duration-150 hover:shadow-soft-md' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
