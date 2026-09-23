export type NavItem = { label: string; href: string; ownerOnly?: boolean };
export type NavGroup = { label: string | null; items: NavItem[] };
export type ApprovedRole = 'SUPER_USER' | 'USER';

export function workspaceForRole(role: string | undefined): string | null {
  if (role === 'USER') return '/user';
  if (role === 'SUPER_USER') return '/super-user';
  return null;
}

/** User navigation groups buying and supplying on one account. */
export const USER_NAV: NavGroup[] = [
  { label: null, items: [{ label: 'Dashboard', href: '/user' }] },
  {
    label: 'Buying',
    items: [
      { label: 'Create tender', href: '/user/tenders/new' },
      { label: 'My tenders', href: '/user/tenders' },
    ],
  },
  {
    label: 'Supplying',
    items: [
      { label: 'Opportunities', href: '/user/opportunities' },
      { label: 'Submitted quotes', href: '/user/quotes' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Activity and payments', href: '/user/billing' },
      { label: 'Profile', href: '/user/profile' },
      { label: 'Support', href: '/user/support' },
    ],
  },
];

/** Super User nav: oversee marketplace participants, payments, and configuration. */
export const SUPER_USER_NAV: NavGroup[] = [
  { label: null, items: [{ label: 'Dashboard', href: '/super-user' }] },
  {
    label: 'Marketplace',
    items: [
      { label: 'Tenders', href: '/super-user/tenders' },
      { label: 'Users', href: '/super-user/retailers' },
      { label: 'Payments', href: '/super-user/payments' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Monitoring', href: '/super-user/compliance' },
      { label: 'Activity log', href: '/super-user/activity-log' },
      { label: 'Analytics', href: '/super-user/analytics' },
      { label: 'Pricing intelligence', href: '/super-user/pricing-intelligence' },
      { label: 'Support', href: '/super-user/support' },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { label: 'Categories', href: '/super-user/categories' },
      { label: 'Partners', href: '/super-user/partners' },
      { label: 'Accountants', href: '/super-user/accountants' },
      { label: 'Accounting', href: '/super-user/accounting' },
      { label: 'Security', href: '/account/security' },
    ],
  },
  {
    label: 'Owner',
    items: [{ label: 'Owner console', href: '/super-user/owner', ownerOnly: true }],
  },
];

/** Accountant nav: restricted to the Accounting Space only. */
export const ACCOUNTANT_NAV: NavGroup[] = [
  { label: null, items: [{ label: 'Accounting', href: '/super-user/accounting' }] },
];
