import { MarketplaceLanding } from '@/components/layout/MarketplaceLanding';
import { PreLaunchLanding } from '@/components/layout/PreLaunchLanding';
import { isPreLaunchActive } from '@/lib/public-launch';
import { getPublicLaunchAt } from '@/server/domain/platformSettings';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const launchAtIso = await getPublicLaunchAt();
  if (!isPreLaunchActive(launchAtIso)) return {};
  return {
    title: 'Trade Tender | Launching soon',
    description:
      'Trade Tender is opening for UK construction Buyers and Suppliers. Register now, then set out jobs, compare quotes, and award the work when we go live.',
  };
}

export default async function HomePage() {
  const launchAtIso = await getPublicLaunchAt();
  if (isPreLaunchActive(launchAtIso) && launchAtIso) {
    return <PreLaunchLanding launchAtIso={launchAtIso} />;
  }
  return <MarketplaceLanding />;
}
