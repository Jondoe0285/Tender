export type NavItem = { label: string; href: string; ownerOnly?: boolean };
export type NavGroup = { label: string | null; items: NavItem[] };
export type ApprovedRole = 'SUPER_USER' | 'CONTRACTOR' | 'PROVIDER';

export function workspaceForRole(role: string | undefined): string | null {
  if (role === 'CONTRACTOR') return '/contractor';
  if (role === 'PROVIDER') return '/provider';
  if (role === 'SUPER_USER') return '/super-user';
  return null;
}

/** Contractor nav: raise and track tenders through to award and payment. */
export const CLIENT_NAV: NavGroup[] = [
  { label: null, items: [{ label: 'Dashboard', href: '/contractor' }] },
  {
    label: 'Tendering',
    items: [
      { label: 'Create Tender', href: '/contractor/tenders/new' },
      { label: 'My Tenders', href: '/contractor/tenders' },
      { label: 'Quotes Received', href: '/contractor/quotes' },
      { label: 'Awarded Projects', href: '/contractor/awarded' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Billing', href: '/contractor/billing' },
      { label: 'Profile', href: '/contractor/profile' },
    ],
  },
];

/** Provider nav: find matched demand, unlock it, and track quote performance. */
export const RETAILER_NAV: NavGroup[] = [
  { label: null, items: [{ label: 'Dashboard', href: '/provider' }] },
  {
    label: 'Tendering',
    items: [
      { label: 'New Opportunities', href: '/provider/opportunities' },
      { label: 'Unlocked Tenders', href: '/provider/unlocked' },
      { label: 'Submitted Quotes', href: '/provider/quotes' },
      { label: 'Performance', href: '/provider/performance' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Billing', href: '/provider/billing' },
      { label: 'Profile', href: '/provider/profile' },
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
      { label: 'Provider Management', href: '/super-user/retailers' },
      { label: 'Contractor Management', href: '/super-user/clients' },
      { label: 'Payment Monitoring', href: '/super-user/payments' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Tender Monitoring', href: '/super-user/compliance' },
      { label: 'Activity Log', href: '/super-user/activity-log' },
      { label: 'Analytics', href: '/super-user/analytics' },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { label: 'Categories', href: '/super-user/categories' },
      { label: 'Partner Management', href: '/super-user/partners' },
      { label: 'Site Settings', href: '/super-user/settings' },
      { label: 'Accountant Management', href: '/super-user/accountants' },
      { label: 'Accounting Space', href: '/super-user/accounting' },
    ],
  },
  {
    label: 'Owner',
    items: [{ label: 'Owner Console', href: '/super-user/owner', ownerOnly: true }],
  },
];

/** Accountant nav: restricted to the Accounting Space only \u2014 no marketplace or configuration access. */
export const ACCOUNTANT_NAV: NavGroup[] = [
  { label: null, items: [{ label: 'Accounting Space', href: '/super-user/accounting' }] },
];
