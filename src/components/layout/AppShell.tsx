'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AccountControls } from '@/components/layout/AccountControls';
import { CLIENT_NAV, RETAILER_NAV, SUPER_USER_NAV, type NavGroup } from '@/lib/navigation';

type Role = 'client' | 'retailer' | 'super-user';

const navByRole: Record<Role, NavGroup[]> = {
  client: CLIENT_NAV,
  retailer: RETAILER_NAV,
  'super-user': SUPER_USER_NAV,
};

const roleLabels: Record<Role, string> = {
  client: 'Client space',
  retailer: 'Retailer space',
  'super-user': 'Super User space',
};

/** Finds the most specific nav item for the current path, so parent and child routes don't both light up. */
function findActiveHref(pathname: string | null, groups: NavGroup[]): string | null {
  if (!pathname) return null;
  const hrefs = groups.flatMap((group) => group.items.map((item) => item.href));
  let best: string | null = null;
  for (const href of hrefs) {
    const matches = pathname === href || pathname.startsWith(`${href}/`);
    if (matches && (!best || href.length > best.length)) best = href;
  }
  return best;
}

function SidebarNav({ groups, activeHref, onNavigate }: { groups: NavGroup[]; activeHref: string | null; onNavigate?: () => void }) {
  return (
    <nav aria-label="Primary" className="flex flex-col gap-6 px-4 py-6">
      {groups.map((group, index) => (
        <div key={group.label ?? `group-${index}`} className="flex flex-col gap-1">
          {group.label && (
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-widest text-site-white/45">{group.label}</p>
          )}
          {group.items.map((item) => {
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={`rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-safety-amber text-foundation-navy'
                    : 'text-site-white/80 hover:bg-white/10 hover:text-site-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function AppShell({ role, title, children }: { role: Role; title: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const groups = navByRole[role];
  const activeHref = findActiveHref(pathname, groups);

  useEffect(() => {
    if (mobileOpen) drawerRef.current?.focus();
    else menuButtonRef.current?.focus();
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen bg-site-white">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-shrink-0 bg-foundation-navy md:flex md:flex-col">
        <Link href="/" className="flex items-center gap-2.5 px-6 py-5 font-heading text-lg font-bold text-site-white">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-safety-amber text-foundation-navy shadow-soft">T</span>
          <span>Trade Tender</span>
        </Link>
        <SidebarNav groups={groups} activeHref={activeHref} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-foundation-navy/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            tabIndex={-1}
            className="relative flex h-full w-72 flex-col bg-foundation-navy shadow-soft-lg"
          >
            <div className="flex items-center justify-between px-6 py-5">
              <Link href="/" className="flex items-center gap-2.5 font-heading text-lg font-bold text-site-white">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-safety-amber text-foundation-navy">T</span>
                <span>Trade Tender</span>
              </Link>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-2 text-site-white/80 hover:bg-white/10"
              >
                &#10005;
              </button>
            </div>
            <SidebarNav groups={groups} activeHref={activeHref} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              ref={menuButtonRef}
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-2 text-foundation-navy hover:bg-foundation-navy/5 md:hidden"
            >
              &#9776;
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-concrete-grey">{roleLabels[role]}</p>
              <h1 className="font-heading text-lg font-bold text-foundation-navy">{title}</h1>
            </div>
          </div>
          <AccountControls />
        </header>
        <main className="flex-1 px-6 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
