import type { ReactNode } from 'react';

export function DataTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.08em] text-concrete-grey">
          <tr>
            {headers.map((header, index) => (
              <th key={`${header}-${index}`} className="px-4 py-2">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function DataRow({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80">
      {children}
    </tr>
  );
}

export function DataCell({
  children,
  numeric = false,
  strong = false,
}: {
  children: ReactNode;
  numeric?: boolean;
  strong?: boolean;
}) {
  return (
    <td
      className={`px-4 py-2 ${numeric ? 'tabular-nums' : ''} ${
        strong ? 'font-semibold text-foundation-navy' : 'text-concrete-grey'
      }`}
    >
      {children}
    </td>
  );
}
