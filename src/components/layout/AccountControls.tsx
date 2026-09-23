'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LinkButton, Button } from '@/components/ui/Button';

export function AccountControls() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return <div className="h-12 w-36" aria-hidden="true" />;
  }

  if (!session?.user) {
    return (
      <LinkButton href="/register" variant="secondary" size="lg">
        Create account
      </LinkButton>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      onClick={() => {
        signOut({ callbackUrl: '/' }).catch(() => {
          router.replace('/');
        });
      }}
    >
      Sign out
    </Button>
  );
}
