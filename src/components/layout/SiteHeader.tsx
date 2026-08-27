'use client';

import Link from 'next/link';
import { AccountControls } from '@/components/layout/AccountControls';

/** Public site header for marketing and auth pages. Authenticated dashboards use AppShell's sidebar nav instead. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5 font-heading text-lg font-bold text-foundation-navy">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-foundation-navy text-site-white shadow-soft">T</span>
          <span>Trade Tender</span>
        </Link>
        <AccountControls />
      </div>
    </header>
  );
}
