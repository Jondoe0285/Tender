import { Suspense } from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-site-white">
      <SiteHeader />
      <main className="flex-1 px-6 sm:px-10">
        <Suspense fallback={null}><LoginForm /></Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
