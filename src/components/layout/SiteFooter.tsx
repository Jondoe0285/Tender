'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TradeTenderLogo } from '@/components/layout/TradeTenderLogo';
import { supportEmail } from '@/lib/contact';

type FooterPartner = { id: string; name: string; logoPath: string; destinationUrl: string | null };

export function SiteFooter() {
  const support = supportEmail();
  const [partners, setPartners] = useState<FooterPartner[]>([]);

  useEffect(() => {
    fetch('/api/partners/footer')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { partners?: FooterPartner[] } | null) => setPartners(data?.partners ?? []))
      .catch(() => setPartners([]));
  }, []);

  return (
    <footer className="mt-auto border-t border-slate-200 bg-foundation-navy px-6 py-10 text-sm text-site-white/75 sm:px-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <TradeTenderLogo variant="dark" />
          <p className="mt-5 max-w-sm leading-relaxed">
            Structured tenders for UK construction supply. Trade Tender is a connection platform, not a party to the final contract.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-site-white">Product</p>
          <div className="mt-4 flex flex-col gap-3 text-xs font-semibold">
            <Link href="/#how-it-works" className="inline-flex min-h-11 items-center hover:text-sky-blue">How it works</Link>
            <Link href="/security" className="inline-flex min-h-11 items-center hover:text-sky-blue">Security</Link>
            <Link href="/demo" className="inline-flex min-h-11 items-center hover:text-sky-blue">Request a demo</Link>
            <Link href="/#buying" className="inline-flex min-h-11 items-center hover:text-sky-blue">Buyers</Link>
            <Link href="/#supplying" className="inline-flex min-h-11 items-center hover:text-sky-blue">Suppliers</Link>
            <Link href="/login" className="inline-flex min-h-11 items-center hover:text-sky-blue">Sign in</Link>
            <Link href="/register" className="inline-flex min-h-11 items-center hover:text-sky-blue">Create account</Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-site-white">Legal</p>
          <div className="mt-4 grid grid-cols-1 gap-3 text-xs font-semibold">
            <Link href="/policies" className="inline-flex min-h-11 items-center hover:text-sky-blue">All policies</Link>
            <Link href="/policies/platform-terms" className="inline-flex min-h-11 items-center hover:text-sky-blue">Platform terms</Link>
            <Link href="/policies/privacy" className="inline-flex min-h-11 items-center hover:text-sky-blue">Privacy</Link>
            <Link href="/policies/payments" className="inline-flex min-h-11 items-center hover:text-sky-blue">Payments</Link>
            <Link href="/policies/accessibility" className="inline-flex min-h-11 items-center hover:text-sky-blue">Accessibility</Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-site-white">Support</p>
          <p className="mt-4 text-xs leading-relaxed text-site-white/70">Account access, payments, and technical issues.</p>
          <div className="mt-4 flex flex-col gap-1 text-xs font-semibold">
          {support && (
            <a href={`mailto:${support}`} className="inline-flex min-h-11 items-center text-site-white underline underline-offset-4 hover:text-sky-blue">
              Email support
            </a>
          )}
          <Link href="/policies/support" className="inline-flex min-h-11 items-center text-site-white underline underline-offset-4 hover:text-sky-blue">
            Support policy
          </Link>
          </div>
          {partners.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-site-white">Affiliated partners</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {partners.map((partner) =>
                  partner.destinationUrl ? (
                    <a key={partner.id} href={partner.destinationUrl} target="_blank" rel="noreferrer" className="flex min-h-16 items-center border border-white/15 bg-white/5 p-2" aria-label={`Visit ${partner.name}`}>
                      <Image src={partner.logoPath} alt={partner.name} width={512} height={192} className="h-auto w-full" />
                    </a>
                  ) : (
                    <div key={partner.id} className="flex min-h-16 items-center border border-white/15 bg-white/5 p-2">
                      <Image src={partner.logoPath} alt={partner.name} width={512} height={192} className="h-auto w-full" />
                    </div>
                  )
                )}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-site-white/60">Affiliated partner information is separate from tender matching, quote ranking, supplier selection, and Buyer decisions.</p>
            </div>
          )}
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-6xl border-t border-site-white/15 pt-5 text-xs text-site-white/50">&copy; 2026 Trade Tender.</p>
    </footer>
  );
}
