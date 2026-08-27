import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/server/auth/session';
import { CATEGORIES, RETAILER_UNLOCK_FEE_GBP } from '@/lib/categories';

export default async function CategoriesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER') redirect('/login');

  return (
    <AppShell role="super-user" title="Categories">
      <div className="mx-auto max-w-5xl">
        <p className="mb-6 max-w-xl text-sm text-concrete-grey">
          Tender categories used for structured tender creation and Retailer matching.
        </p>
        <div className="grid gap-5 sm:grid-cols-3">
          {Object.entries(CATEGORIES).map(([service, categoryMap]) => (
            <Card key={service} interactive>
              <h2 className="font-heading text-lg font-bold text-foundation-navy">{service}</h2>
              <p className="mt-2 text-sm text-concrete-grey">{Object.keys(categoryMap).length} categories</p>
              <p className="mt-1 text-sm font-semibold text-steel-blue">£{RETAILER_UNLOCK_FEE_GBP} unlock fee</p>
              <ul className="mt-4 flex flex-col gap-1 text-sm text-concrete-grey">
                {Object.entries(categoryMap).map(([category, items]) => (
                  <li key={category}><span className="font-semibold text-foundation-navy">{category}</span> ({items.length} items)</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
