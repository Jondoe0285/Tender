export type NavItem = { label: string; href: string; ownerOnly?: boolean };
export type NavGroup = { label: string | null; items: NavItem[] };
export type ApprovedRole = 'SUPER_USER' | 'USER';

export function workspaceForRole(role: string | undefined): string | null {
  if (role === 'USER') return '/user';
  if (role === 'SUPER_USER') return '/super-user';
  return null;
}

/** User navigation combines tender ownership and matched opportunity workflows. */
export const USER_NAV: NavGroup[] = [
  { label: null, items: [{ label: 'Dashboard', href: '/user' }] },
  {
    label: 'Tendering',
    items: [
      { label: 'Create Tender', href: '/user/tenders/new' },
      { label: 'My Tenders', href: '/user/tenders' },
      { label: 'Tender Opportunities', href: '/user/opportunities' },
      { label: 'Submitted Quotes', href: '/user/quotes' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Activity History', href: '/user/billing' },
      { label: 'Profile', href: '/user/profile' },
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
      { label: 'User Management', href: '/super-user/retailers' },
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
