type LogoVariant = 'light' | 'dark';

/** SVG mark plus wordmark. Dark variant is for navy surfaces — no white badge. */
export function TradeTenderLogo({ className = '', variant = 'light' }: { className?: string; variant?: LogoVariant }) {
  const ink = variant === 'dark' ? '#FFFFFF' : '#0D1B2A';
  const mark = variant === 'dark' ? '#FFFFFF' : '#0D1B2A';

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 40 40" width="32" height="32" aria-hidden="true" className="h-8 w-8 flex-shrink-0">
        <path fill="#F28C28" d="M3.5 5h21.5l-2.8 7H6.3z" />
        <path fill={mark} d="M14 11h6.2v24H14z" />
        <path fill={mark} d="M14 11h18l-3.4 7H14z" />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight sm:text-base" style={{ color: ink }}>
        Trade Tender
      </span>
    </span>
  );
}
