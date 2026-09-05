import Image from 'next/image';

const logoSources = {
  light: { src: '/images/brand/candidate/logos/Trade_Tender_Horizontal_Name_Logo.png', width: 500, height: 180 },
  dark: { src: '/images/brand/Trade_Tender_Dark_Background_Logo.png', width: 415, height: 115 },
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