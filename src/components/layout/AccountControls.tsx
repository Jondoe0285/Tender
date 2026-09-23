'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LinkButton, Button } from '@/components/ui/Button';

export function AccountControls() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return <div className="h-12 w-72" aria-hidden="true" />;
  }

  if (!session?.user) {
    return (
      <div className="flex flex-shrink-0 items-center gap-2">
        <LinkButton href="/login" size="lg">
          Sign in
        </LinkButton>
        <LinkButton href="/register" variant="secondary" size="lg">
          Create account
        </LinkButton>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="md"
      className="h-9 px-4 text-sm"
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
