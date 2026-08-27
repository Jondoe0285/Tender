'use client';

import Link from 'next/link';
import { AccountControls } from '@/components/layout/AccountControls';
import { TradeTenderLogo } from '@/components/layout/TradeTenderLogo';

/** Public site header for marketing and auth pages. Authenticated dashboards use AppShell's sidebar nav instead. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4 sm:px-10">
        <Link href="/" className="block w-44 sm:w-52" aria-label="Trade Tender home">
          <TradeTenderLogo />
        </Link>
        <AccountControls />
      </div>
    </header>
  );
}
