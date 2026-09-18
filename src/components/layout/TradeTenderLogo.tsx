import Image from 'next/image';

const logoSources = {
  light: { src: '/images/brand/Trade_Tender_Candidate_Horizontal_Logo.png', width: 279, height: 116 },
  dark: { src: '/images/brand/Trade_Tender_Candidate_Horizontal_Logo.png', width: 279, height: 116 },
} as const;

export function TradeTenderLogo({ className = '', variant = 'light' }: { className?: string; variant?: keyof typeof logoSources }) {
  const logo = logoSources[variant];

  return (
    <Image
      src={logo.src}
      alt="Trade Tender"
      width={logo.width}
      height={logo.height}
      priority
      className={`h-auto w-full ${className}`}
    />
  );
}