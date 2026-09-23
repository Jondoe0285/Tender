'use client';

import Link from 'next/link';
import { TradeTenderLogo } from '@/components/layout/TradeTenderLogo';
import { LinkButton } from '@/components/ui/Button';

/** Public site header. Authenticated workspaces use AppShell. Sign in and Create account stay paired on this bar. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3 sm:px-10">
        <div className="flex min-w-0 items-center gap-8">
          <Link href="/" className="flex items-center" aria-label="Trade Tender home">
            <TradeTenderLogo />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-foundation-navy md:flex" aria-label="Marketing">
            <Link href="/#how-it-works" className="hover:text-trade-blue">How it works</Link>
            <Link href="/security" className="hover:text-trade-blue">Security</Link>
            <Link href="/demo" className="hover:text-trade-blue">Request a demo</Link>
            <Link href="/#buying" className="hover:text-trade-blue">Buyers</Link>
            <Link href="/#supplying" className="hover:text-trade-blue">Suppliers</Link>
          </nav>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <LinkButton href="/login" size="lg">
            Sign in
          </LinkButton>
          <LinkButton href="/register" variant="secondary" size="lg">
            Create account
          </LinkButton>
        </div>
      </div>
    </header>
  );
}
