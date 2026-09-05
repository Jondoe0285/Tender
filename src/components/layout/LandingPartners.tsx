'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

type Partner = { id: string; name: string; logoPath: string; destinationUrl: string | null };

export function LandingPartners() {
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    fetch('/api/partners/footer')
      .then((response) => response.ok ? response.json() : null)
      .then((data: { partners?: Partner[] } | null) => setPartners(data?.partners ?? []))
      .catch(() => setPartners([]));
  }, []);

  if (partners.length === 0) return null;

  return (
    <section aria-labelledby="partner-information" className="border-y border-slate-200 bg-light-grey">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-9 sm:px-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-steel-blue">Partner information</p>
          <h2 id="partner-information" className="mt-2 font-heading text-xl font-bold text-foundation-navy">Affiliated construction support</h2>
          <p className="mt-2 text-sm leading-relaxed text-concrete-grey">Partner information is separate from tender matching, quote ranking, supplier selection, and Contractor decisions.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap lg:justify-end">
          {partners.map((partner) => (
            partner.destinationUrl ? (
              <a key={partner.id} href={partner.destinationUrl} target="_blank" rel="noreferrer" className="flex h-20 min-w-36 items-center justify-center border border-slate-200 bg-white p-3 outline-offset-4 hover:border-steel-blue hover:ring-2 hover:ring-steel-blue/20" aria-label={`Visit ${partner.name}`}>
                <Image src={partner.logoPath} alt={partner.name} width={512} height={192} className="max-h-12 w-auto max-w-full object-contain" />
              </a>
            ) : (
              <div key={partner.id} className="flex h-20 min-w-36 items-center justify-center border border-slate-200 bg-white p-3" aria-label={partner.name}>
                <Image src={partner.logoPath} alt={partner.name} width={512} height={192} className="max-h-12 w-auto max-w-full object-contain" />
              </div>
            )
          ))}
        </div>
      </div>
    </section>
  );
}