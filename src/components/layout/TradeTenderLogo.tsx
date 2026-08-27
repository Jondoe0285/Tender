import Image from 'next/image';

export function TradeTenderLogo({ className = '' }: { className?: string }) {
  return (
    <Image
      src="/images/Trade-Tender-Logo.png"
      alt="Trade Tender"
      width={615}
      height={206}
      priority
      className={`h-auto w-full ${className}`}
    />
  );
}