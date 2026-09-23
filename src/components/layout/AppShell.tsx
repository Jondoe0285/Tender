'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AccountControls } from '@/components/layout/AccountControls';
import { TradeTenderLogo } from '@/components/layout/TradeTenderLogo';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { USER_NAV, SUPER_USER_NAV, ACCOUNTANT_NAV, type NavGroup } from '@/lib/navigation';

type Role = 'client' | 'retailer' | 'super-user';

const navByRole: Record<Role, NavGroup[]> = {
  client: USER_NAV,
  retailer: USER_NAV,
  'super-user': SUPER_USER_NAV,
};

const roleLabels: Record<Role, string> = {
  client: 'Workspace',
  retailer: 'Workspace',
  'super-user': 'Platform ops',
};

const workspaceOptions: Record<string, { label: string; path: string }> = {
  USER: { label: 'Workspace', path: '/user' },
  SUPER_USER: { label: 'Platform ops', path: '/super-user' },
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

function SidebarNav({ groups, activeHref, unreadOpportunityCount, onNavigate }: { groups: NavGroup[]; activeHref: string | null; unreadOpportunityCount: number; onNavigate?: () => void }) {
  return (
    <nav aria-label="Primary" className="flex flex-col gap-5 px-3 py-4">
      {groups.map((group, index) => (
        <div key={group.label ?? `group-${index}`} className="flex flex-col gap-0.5">
          {group.label && (
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-site-white/40">{group.label}</p>
          )}
          {group.items.map((item) => {
            const active = item.href === activeHref;
            const showUnreadBadge = item.href === '/user/opportunities' && unreadOpportunityCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center justify-between gap-3 rounded-md border-l-2 px-3 py-2 text-[13px] font-medium transition-colors ${
                  active
                    ? 'border-sky-blue bg-white/10 text-site-white'
                    : 'border-transparent text-site-white/75 hover:bg-white/10 hover:text-site-white'
                }`}
              >
                <span>{item.label}</span>
                {showUnreadBadge && (
                  <span className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-xs font-bold ${active ? 'bg-trade-blue text-site-white' : 'bg-white/15 text-site-white'}`} aria-label={`${unreadOpportunityCount} unread tender opportunities`}>
                    {unreadOpportunityCount > 99 ? '99+' : unreadOpportunityCount}
                  </span>
                )}
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
  const [unreadOpportunityCount, setUnreadOpportunityCount] = useState(0);
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

  useEffect(() => {
    if (role === 'super-user' || session?.user?.role !== 'USER') return;
    fetch('/api/opportunities/unread')
      .then((response) => response.ok ? response.json() : null)
      .then((data: { count?: number } | null) => setUnreadOpportunityCount(data?.count ?? 0))
      .catch(() => setUnreadOpportunityCount(0));
  }, [role, session?.user?.role]);

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
    <div className="flex min-h-screen bg-light-grey">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 flex-shrink-0 bg-foundation-navy md:flex md:flex-col">
        <Link href="/" className="mx-3 mt-4 block border-b border-white/10 px-2 pb-4" aria-label="Trade Tender home">
          <TradeTenderLogo variant="dark" />
        </Link>
        <SidebarNav groups={groups} activeHref={activeHref} unreadOpportunityCount={unreadOpportunityCount} />
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
            id="mobile-navigation-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            tabIndex={-1}
            className="relative flex h-full w-60 flex-col bg-foundation-navy"
          >
            <div className="flex items-center justify-between px-6 py-5">
              <Link href="/" className="block" aria-label="Trade Tender home">
                <TradeTenderLogo variant="dark" />
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
            <SidebarNav groups={groups} activeHref={activeHref} unreadOpportunityCount={unreadOpportunityCount} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation-drawer"
              ref={menuButtonRef}
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-2 text-foundation-navy hover:bg-slate-100 md:hidden"
            >
              &#9776;
            </button>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-concrete-grey">{roleLabels[role]}</p>
              <h1 className="truncate text-base font-semibold tracking-tight text-foundation-navy">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {availableWorkspaces.length > 1 && (
              <label className="flex items-center gap-2 text-xs font-semibold text-concrete-grey">
                <span className="sr-only">Switch workspace</span>
                <select
                  value={role === 'super-user' ? 'SUPER_USER' : 'USER'}
                  onChange={switchWorkspace}
                  className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-foundation-navy focus:border-trade-blue focus:outline-none focus:ring-2 focus:ring-trade-blue/30"
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
        <main id="main-content" className="flex-1 px-5 py-5 sm:px-8">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}
