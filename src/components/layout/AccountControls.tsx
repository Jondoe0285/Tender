'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LinkButton, Button } from '@/components/ui/Button';

export function AccountControls() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return <div className="h-9 w-28" aria-hidden="true" />;
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/login" className="text-sm font-semibold text-foundation-navy hover:text-trade-blue">
          Sign in
        </Link>
        <LinkButton href="/register" size="md" className="h-9 px-4 text-sm">
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
