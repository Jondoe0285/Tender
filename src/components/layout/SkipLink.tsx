/** Moves keyboard users past chrome. Visually hidden until focused. */
export function SkipLink({ href = '#main-content' }: { href?: string }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-md focus:bg-trade-blue focus:px-4 focus:text-sm focus:font-semibold focus:text-site-white"
    >
      Skip to content
    </a>
  );
}
