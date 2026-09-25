import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { readUnsubscribeToken } from '@/server/notifications/marketingUnsubscribe';
import { UnsubscribeMarketingForm } from '@/components/marketing/UnsubscribeMarketingForm';

export const dynamic = 'force-dynamic';

export default async function UnsubscribeMarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token ?? '';
  const email = readUnsubscribeToken(token);

  return (
    <div className="flex min-h-screen flex-col bg-light-grey">
      <SiteHeader />
      <main id="main-content" className="flex-1 px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-xl rounded-md border border-slate-200 bg-white px-6 py-10">
          <h1 className="text-xl font-semibold text-foundation-navy">HSEQ ConsultHub emails</h1>
          {!email ? (
            <p className="mt-3 text-sm leading-6 text-concrete-grey">This unsubscribe link is not valid. If you still receive marketing, use the unsubscribe link in the most recent message.</p>
          ) : (
            <>
              <p className="mt-3 text-sm leading-6 text-concrete-grey">
                Confirm to stop HSEQ ConsultHub marketing emails to this address. Transactional Trade Tender messages about tenders, quotes, and your account are not affected.
              </p>
              <UnsubscribeMarketingForm token={token} />
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
