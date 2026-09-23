import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { LoginForm } from '@/components/auth/LoginForm';
import { isSignInActive } from '@/server/domain/platformSettings';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verification?: string; password?: string; error?: string }>;
}) {
  const notices = await searchParams;
  const signInActive = await isSignInActive();

  return (
    <div className="flex min-h-screen flex-col bg-light-grey">
      <SiteHeader />
      <main id="main-content" className="flex-1 px-6 sm:px-10">
        <LoginForm notices={notices} signInActive={signInActive} />
      </main>
      <SiteFooter />
    </div>
  );
}
