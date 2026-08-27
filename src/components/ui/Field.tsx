import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export const fieldControlClasses =
  'w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-foundation-navy shadow-soft ' +
  'transition-colors placeholder:text-concrete-grey/70 hover:border-steel-blue/50 ' +
  'focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/40 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-concrete-grey';

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={`text-sm font-semibold text-foundation-navy ${props.className ?? ''}`} />;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldControlClasses} ${props.className ?? ''}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldControlClasses} resize-y ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldControlClasses} ${props.className ?? ''}`} />;
}

export function FieldGroup({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={`flex flex-col gap-2 ${wide ? 'sm:col-span-2' : ''}`}>{children}</div>;
}
