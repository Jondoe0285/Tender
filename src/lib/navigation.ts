export type NavItem = { label: string; href: string };
export type NavGroup = { label: string | null; items: NavItem[] };
export type ApprovedRole = 'SUPER_USER' | 'CLIENT' | 'RETAILER';

export function workspaceForRole(role: string | undefined): string | null {
  if (role === 'CLIENT') return '/client';
  if (role === 'RETAILER') return '/retailer';
  if (role === 'SUPER_USER') return '/super-user';
  return null;
}

/** Client nav: raise and track tenders through to award and payment. */
export const CLIENT_NAV: NavGroup[] = [
  { label: null, items: [{ label: 'Dashboard', href: '/client' }] },
  {
    label: 'Tendering',
    items: [
      { label: 'Create Tender', href: '/client/tenders/new' },
      { label: 'My Tenders', href: '/client/tenders' },
      { label: 'Quotes Received', href: '/client/quotes' },
      { label: 'Awarded Projects', href: '/client/awarded' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Billing', href: '/client/billing' },
      { label: 'Profile', href: '/client/profile' },
    ],
  },
];

/** Retailer nav: find matched demand, unlock it, and track quote performance. */
export const RETAILER_NAV: NavGroup[] = [
  { label: null, items: [{ label: 'Dashboard', href: '/retailer' }] },
  {
    label: 'Tendering',
    items: [
      { label: 'New Opportunities', href: '/retailer/opportunities' },
      { label: 'Unlocked Tenders', href: '/retailer/unlocked' },
      { label: 'Submitted Quotes', href: '/retailer/quotes' },
      { label: 'Performance', href: '/retailer/performance' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Billing', href: '/retailer/billing' },
      { label: 'Profile', href: '/retailer/profile' },
    ],
  },
];

/** Super User nav: oversee marketplace participants, payments, and configuration. */
export const SUPER_USER_NAV: NavGroup[] = [
  { label: null, items: [{ label: 'Dashboard', href: '/super-user' }] },
  {
    label: 'Marketplace',
    items: [
      { label: 'Tender Management', href: '/super-user/tenders' },
      { label: 'Retailer Management', href: '/super-user/retailers' },
      { label: 'Client Management', href: '/super-user/clients' },
      { label: 'Payment Monitoring', href: '/super-user/payments' },
    ],
  },
  { label: 'Insights', items: [{ label: 'Analytics', href: '/super-user/analytics' }] },
  {
    label: 'Configuration',
    items: [
      { label: 'Categories', href: '/super-user/categories' },
      { label: 'Site Settings', href: '/super-user/settings' },
    ],
  },
];
