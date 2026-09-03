'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AccountControls } from '@/components/layout/AccountControls';
import { TradeTenderLogo } from '@/components/layout/TradeTenderLogo';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { CLIENT_NAV, RETAILER_NAV, SUPER_USER_NAV, ACCOUNTANT_NAV, type NavGroup } from '@/lib/navigation';

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

const workspaceOptions: Record<string, { label: string; path: string }> = {
  CLIENT: { label: 'Client workspace', path: '/client' },
  RETAILER: { label: 'Retailer workspace', path: '/retailer' },
  SUPER_USER: { label: 'Super User workspace', path: '/super-user' },
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
  const router = useRouter();
  const { data: session, update } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const isOwner = Boolean(session?.user?.isOwner);
  const isAccountant = Boolean(session?.user?.isAccountant);
  const baseGroups = role === 'super-user' && isAccountant ? ACCOUNTANT_NAV : navByRole[role];
  const groups = baseGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.ownerOnly || isOwner) }))
    .filter((group) => group.items.length > 0);
  const activeHref = findActiveHref(pathname, groups);
  const availableWorkspaces = (session?.user?.roles ?? []).filter((workspaceRole) => workspaceOptions[workspaceRole]);

  async function switchWorkspace(event: React.ChangeEvent<HTMLSelectElement>) {
    const workspace = workspaceOptions[event.target.value];
    if (!workspace) return;
    await update({ role: event.target.value });
    router.push(workspace.path);
    router.refresh();
  }

  useEffect(() => {
    if (mobileOpen) drawerRef.current?.focus();
    else menuButtonRef.current?.focus();
  }, [mobileOpen]);

  // Escape closes the mobile drawer; Tab is trapped inside it while open.
  useEffect(() => {
    if (!mobileOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !drawerRef.current) return;

      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  // Records the in-app pages a signed-in user visits, for the Super User analytics profile view.
  useEffect(() => {
    if (!pathname || !session?.user?.id) return;
    fetch('/api/track/page-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => null);
  }, [pathname, session?.user?.id]);

  return (
    <div className="flex min-h-screen bg-site-white">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-shrink-0 bg-foundation-navy md:flex md:flex-col">
        <Link href="/" className="mx-4 mt-4 block bg-site-white p-2" aria-label="Trade Tender home">
          <TradeTenderLogo />
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
              <Link href="/" className="block w-52 bg-site-white p-2" aria-label="Trade Tender home">
                <TradeTenderLogo />
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
          <div className="flex items-center gap-3">
            {availableWorkspaces.length > 1 && (
              <label className="flex items-center gap-2 text-xs font-semibold text-concrete-grey">
                <span className="sr-only">Switch workspace</span>
                <select
                  value={role === 'client' ? 'CLIENT' : role === 'retailer' ? 'RETAILER' : 'SUPER_USER'}
                  onChange={switchWorkspace}
                  className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-foundation-navy shadow-soft focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30"
                >
                  {availableWorkspaces.map((workspaceRole) => (
                    <option key={workspaceRole} value={workspaceRole}>
                      {workspaceOptions[workspaceRole].label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <AccountControls />
          </div>
        </header>
        <main className="flex-1 px-6 py-8 sm:px-8">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}
