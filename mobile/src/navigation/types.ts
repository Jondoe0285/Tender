export type RouteName =
  | 'dashboard'
  | 'tenders'
  | 'createTender'
  | 'tender'
  | 'awarded'
  | 'opportunities'
  | 'quotes'
  | 'verification'
  | 'billing'
  | 'profile'
  | 'support';

export type Route =
  | { name: 'dashboard' }
  | { name: 'tenders' }
  | { name: 'createTender' }
  | { name: 'tender'; tenderId: string; intent?: 'buy' | 'supply' }
  | { name: 'awarded' }
  | { name: 'opportunities' }
  | { name: 'quotes' }
  | { name: 'verification' }
  | { name: 'billing' }
  | { name: 'profile' }
  | { name: 'support' };

export type WorkspaceTab = 'dashboard' | 'buying' | 'supplying' | 'account';

export const WORKSPACE_TABS: { id: WorkspaceTab; label: string; route: Route }[] = [
  { id: 'dashboard', label: 'Dashboard', route: { name: 'dashboard' } },
  { id: 'buying', label: 'Buying', route: { name: 'tenders' } },
  { id: 'supplying', label: 'Supplying', route: { name: 'opportunities' } },
  { id: 'account', label: 'Account', route: { name: 'profile' } },
];

export function tabForRoute(route: Route): WorkspaceTab {
  switch (route.name) {
    case 'dashboard':
      return 'dashboard';
    case 'tenders':
    case 'createTender':
    case 'awarded':
      return 'buying';
    case 'tender':
      return route.intent === 'supply' ? 'supplying' : 'buying';
    case 'opportunities':
    case 'quotes':
    case 'verification':
      return 'supplying';
    default:
      return 'account';
  }
}

export function titleForRoute(route: Route): string {
  switch (route.name) {
    case 'dashboard': return 'Dashboard';
    case 'tenders': return 'My tenders';
    case 'createTender': return 'Create tender';
    case 'tender': return 'Tender';
    case 'awarded': return 'Awarded';
    case 'opportunities': return 'Opportunities';
    case 'quotes': return 'Submitted quotes';
    case 'verification': return 'Verification';
    case 'billing': return 'Activity and payments';
    case 'profile': return 'Profile';
    case 'support': return 'Support';
  }
}
