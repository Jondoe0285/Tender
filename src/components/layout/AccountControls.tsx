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
      onClick={() => signOut({ callbackUrl: '/' })}
    >
      Sign out
    </Button>
  );
}
