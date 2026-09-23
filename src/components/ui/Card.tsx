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
      className={`rounded-md border border-slate-200 bg-white p-5 ${
        interactive ? 'transition-colors duration-150 hover:border-trade-blue/50 hover:bg-slate-50/60' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
