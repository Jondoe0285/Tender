export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50 px-6 py-8 text-sm text-concrete-grey sm:px-10">
      <div className="mx-auto max-w-6xl">
        <p className="max-w-2xl">
          Trade Tender is a connection and tender-management platform. We do not supply, contract,
          broker, or guarantee the final agreement between Clients and Retailers.
        </p>
        <p className="mt-4 text-xs">&copy; {new Date().getFullYear()} Trade Tender. UK construction tendering.</p>
      </div>
    </footer>
  );
}
