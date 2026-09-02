import Link from 'next/link';

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-steel-blue">Trade Tender</p>
        <h1 className="mt-3 font-heading text-3xl font-bold text-foundation-navy">You are offline</h1>
        <p className="mt-4 text-base leading-relaxed text-concrete-grey">
          Reconnect to access tender information, quotes, payments, and account actions.
        </p>
        <Link
          className="mt-8 inline-flex rounded bg-steel-blue px-5 py-3 text-sm font-semibold text-white hover:bg-foundation-navy"
          href="/"
        >
          Try again
        </Link>
      </div>
    </main>
  );
}