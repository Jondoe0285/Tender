import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getCurrentUser } from '@/server/auth/session';
import { RETAILER_UNLOCK_FEE_GBP, CLIENT_RELEASE_FEE_GBP } from '@/lib/categories';

const partners = [
  { name: 'Sinclair Safety Solutions Ltd', status: 'Active' },
  { name: 'Smart Works Civils Ltd', status: 'Active' },
];

export default async function SiteSettingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER') redirect('/login');

  return (
    <AppShell role="super-user" title="Site Settings">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10">
          <h2 className="mb-4 font-heading text-lg font-bold text-foundation-navy">Fees</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Card>
              <p className="font-heading text-3xl font-bold text-foundation-navy">£{RETAILER_UNLOCK_FEE_GBP}</p>
              <p className="mt-2 text-sm text-concrete-grey">Retailer tender unlock fee</p>
            </Card>
            <Card>
              <p className="font-heading text-3xl font-bold text-foundation-navy">£{CLIENT_RELEASE_FEE_GBP}</p>
              <p className="mt-2 text-sm text-concrete-grey">Client Accepted Quote Release Fee</p>
            </Card>
          </div>
        </div>

        <div>
          <h2 className="mb-2 font-heading text-lg font-bold text-foundation-navy">Partner advertising</h2>
          <p className="mb-4 max-w-2xl text-sm text-concrete-grey">
            Partner placements are clearly labelled as advertising and kept separate from tender
            matching, quote ranking, and Client decision-making.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {partners.map((partner) => (
              <Card key={partner.name} className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">Advertising</p>
                  <h3 className="font-heading text-base font-bold text-foundation-navy">{partner.name}</h3>
                </div>
                <StatusBadge status="approved">{partner.status}</StatusBadge>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
