import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';

export default function PaymentCancelledPage() {
  return (
    <div className="flex min-h-screen flex-col bg-site-white">
      <SiteHeader />
      <main id="main-content" className="flex-1 px-6 py-16 sm:px-10"><section className="mx-auto max-w-lg rounded-md border border-attention/30 bg-white p-8"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-attention">Payment cancelled</p><h1 className="mt-3 text-xl font-semibold tracking-tight text-foundation-navy">No payment was confirmed</h1><p className="mt-3 text-sm leading-relaxed text-concrete-grey">Your protected tender or contact details remain locked. Return to your workspace to try again.</p><Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-md bg-trade-blue px-5 text-sm font-semibold text-site-white hover:bg-trade-blue/90">Return to Trade Tender</Link></section></main>
      <SiteFooter />
    </div>
  );
}
