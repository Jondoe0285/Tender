'use client';

import { useSession, signOut } from 'next-auth/react';
import { LinkButton, Button } from '@/components/ui/Button';

export function AccountControls() {
  const { data: session, status } = useSession();

  if (status === 'loading') return null;

  if (!session?.user) {
    return (
      <LinkButton href="/login" variant="secondary" size="md" className="h-9 px-4 text-sm">
        Sign in
      </LinkButton>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="md"
      className="h-9 px-4 text-sm"
      onClick={() => {
        // Falls back to a hard navigation if the sign-out request itself fails, so the user is
        // never left on a protected page believing sign-out silently did nothing.
        signOut({ callbackUrl: '/' }).catch(() => {
          window.location.href = '/';
        });
      }}
    >
      Sign out
    </Button>
  );
}
