import Image from 'next/image';
import { TradeTenderLogo } from '@/components/layout/TradeTenderLogo';
import { supportEmail } from '@/lib/contact';

export function SiteFooter() {
  const support = supportEmail();
  return (
    <footer className="mt-auto border-t-4 border-safety-amber bg-foundation-navy px-6 py-10 text-sm text-site-white/75 sm:px-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <div className="w-56 bg-site-white p-2"><TradeTenderLogo /></div>
          <p className="mt-5 max-w-xl leading-relaxed">
            Trade Tender is a connection and tender-management platform. We do not supply, contract,
            broker, or guarantee the final agreement between Clients and Retailers.
          </p>
        </div>
        <div className="border-l-0 border-site-white/15 lg:border-l lg:pl-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-safety-amber">Policies</p>
          <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 text-xs font-semibold">
            <a href="/policies#platform-terms" className="hover:text-hi-viz-tint">Platform terms</a>
            <a href="/policies#client-terms" className="hover:text-hi-viz-tint">Client terms</a>
            <a href="/policies#retailer-terms" className="hover:text-hi-viz-tint">Retailer terms</a>
            <a href="/policies#marketplace-disclaimer" className="hover:text-hi-viz-tint">Marketplace disclaimer</a>
            <a href="/policies#privacy" className="hover:text-hi-viz-tint">Privacy</a>
            <a href="/policies#cookies" className="hover:text-hi-viz-tint">Cookies</a>
            <a href="/policies#quote-retention" className="hover:text-hi-viz-tint">Quote retention</a>
            <a href="/policies#payments" className="hover:text-hi-viz-tint">Payments and refunds</a>
            <a href="/policies#contact-release" className="hover:text-hi-viz-tint">Contact release</a>
            <a href="/policies#acceptable-use" className="hover:text-hi-viz-tint">Acceptable use</a>
            <a href="/policies#partners" className="hover:text-hi-viz-tint">Partner links</a>
            <a href="/policies#accessibility" className="hover:text-hi-viz-tint">Accessibility</a>
          </div>
        </div>
        <div className="border-l-0 border-site-white/15 md:border-l md:pl-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-safety-amber">Partner information</p>
          <div className="mt-4 grid max-w-md grid-cols-2 gap-3">
            <a href="https://www.sinclairsafetysolutions.co.uk" target="_blank" rel="noreferrer" className="flex min-h-20 items-center bg-white p-3 outline-offset-4 hover:ring-2 hover:ring-hi-viz-tint" aria-label="Visit Sinclair Safety Solutions Ltd">
              <Image src="/images/Sinclair%20Safety%20Solutions%20Logo.jpeg" alt="Sinclair Safety Solutions Ltd" width={2048} height={505} className="h-auto w-full" />
            </a>
            <a href="https://www.smartworkscivils.com" target="_blank" rel="noreferrer" className="flex min-h-20 items-center bg-white p-3 outline-offset-4 hover:ring-2 hover:ring-hi-viz-tint" aria-label="Visit Smart Works Civils Ltd">
              <Image src="/images/Smart%20Works%20Civils%20Logo.png" alt="Smart Works Civils Ltd" width={512} height={241} className="h-auto w-full" />
            </a>
          </div>
          <p className="mt-4 max-w-md text-xs leading-relaxed text-site-white/60">
            Partner information is separate from tender matching, quote ranking, supplier selection, and Client decisions.
          </p>
          <div className="mt-5 border-t border-site-white/15 pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-safety-amber">Contact us</p>
            <p className="mt-2 text-xs leading-relaxed text-site-white/70">Support for account access, platform use, payments, and technical issues.</p>
            {support && <a href={`mailto:${support}`} className="mt-2 inline-block text-xs font-semibold text-site-white underline underline-offset-4 hover:text-hi-viz-tint">Email support</a>}
            <a href="/policies#support" className="ml-4 text-xs font-semibold text-site-white underline underline-offset-4 hover:text-hi-viz-tint">Support policy</a>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-6xl border-t border-site-white/15 pt-5 text-xs text-site-white/50">&copy; {new Date().getFullYear()} Trade Tender. UK construction tendering.</p>
    </footer>
  );
}
